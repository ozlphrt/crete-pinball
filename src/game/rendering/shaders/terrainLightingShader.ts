import Phaser from 'phaser';

export const TERRAIN_LIGHTING_SHADER_KEY = 'aegean_terrain_dynamic_lighting';

export const TERRAIN_LIGHTING_VERT_SRC = `
precision mediump float;

uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;
uniform vec2 uResolution;

attribute vec2 inPosition;

varying vec2 fragCoord;
varying vec2 outTexCoord;

void main () {
   gl_Position = uProjectionMatrix * uViewMatrix * vec4(inPosition, 1.0, 1.0);
   fragCoord = inPosition;
   outTexCoord = vec2(inPosition.x / uResolution.x, inPosition.y / uResolution.y);
}
`;

export const TERRAIN_LIGHTING_FRAG_SRC = `
precision mediump float;

uniform sampler2D iChannel0; // aegean_terrain_daylight (RGB = daylight satellite, A = land mask)
uniform sampler2D iChannel1; // aegean_terrain_normal (RGB = normal vector, A = DEM elevation)
uniform vec2 uResolution;

uniform int uLightCount;
uniform vec4 uLight0;
uniform vec4 uLight1;
uniform vec4 uLight2;
uniform vec4 uLight3;
uniform vec3 uLightColor0;
uniform vec3 uLightColor1;
uniform vec3 uLightColor2;
uniform vec3 uLightColor3;

varying vec2 fragCoord;
varying vec2 outTexCoord;

void main (void) {
    if (uLightCount <= 0) {
        gl_FragColor = vec4(0.0);
        return;
    }

    vec2 uv = outTexCoord;
    vec4 dayTex = texture2D(iChannel0, uv);
    vec4 normTex = texture2D(iChannel1, uv);

    vec2 pixelCoord = fragCoord;

    // Unpack normal vector from [0, 1] to [-1, 1]
    vec3 N;
    N.xy = (normTex.rg - 0.5) * 2.0;
    N.z = normTex.b;
    N = normalize(N);

    // Surface elevation in scaled height units (0 = sea level, up to ~45 for high summits)
    float hSurf = normTex.a * 45.0;
    bool isLand = dayTex.a > 0.04 || normTex.a > 0.02;

    vec3 totalPremulRGB = vec3(0.0);
    float totalAlpha = 0.0;

    for (int i = 0; i < 4; i++) {
        if (i >= uLightCount) break;

        vec4 lData;
        vec3 lColor;
        if (i == 0) { lData = uLight0; lColor = uLightColor0; }
        else if (i == 1) { lData = uLight1; lColor = uLightColor1; }
        else if (i == 2) { lData = uLight2; lColor = uLightColor2; }
        else { lData = uLight3; lColor = uLightColor3; }

        vec2 lPos = lData.xy;
        float baseRadius = lData.z;
        float lIntensity = lData.w;

        if (baseRadius <= 2.0 || lIntensity <= 0.002) continue;

        vec2 toLight = lPos - pixelCoord;
        float dist = length(toLight);

        // 1. Organic, Topography-Guided Boundary (Breaks the artificial perfect circle)
        // High mountain summits catch light further away; low valleys extinguish sooner.
        // Multi-frequency harmonic variation models natural non-Euclidean light dissipation across Aegean channels.
        float angle = atan(toLight.y, toLight.x);
        float harmonicNoise = sin(angle * 2.0 + 1.1) * 0.07 + sin(angle * 5.0 - 0.7) * 0.045 + cos(angle * 7.0 + 1.9) * 0.025;
        float elevationReach = 0.82 + 0.28 * clamp(hSurf / 32.0, 0.0, 1.0);
        float effectiveRadius = baseRadius * elevationReach * (1.0 + harmonicNoise);

        if (dist >= effectiveRadius) continue;

        // 2. Smooth C2 Quintic Falloff (Continuous 1st & 2nd derivatives = ZERO hard border)
        // t goes from 1.0 at impact point to 0.0 at perimeter
        float normDist = dist / effectiveRadius;
        float t = clamp(1.0 - normDist, 0.0, 1.0);
        // Quintic smoothstep: 6t^5 - 15t^4 + 10t^3 ensures zero 1st and 2nd derivatives at borders
        float smoothEdge = t * t * t * (t * (6.0 * t - 15.0) + 10.0);

        // 3. Physically-Based Distance Falloff (Smooth inverse-distance fading)
        // With a larger illuminated region, gentler quadratic falloff preserves rich daylight radiance across islands
        float distanceFalloff = smoothEdge / (1.0 + 1.20 * normDist * normDist);

        // 4. 3D Light Direction from Surface to Elevated Light Source
        // Elevated to 48.0 height units to cast dramatic, cinematic horizon shadows across the broader terrain region
        float lightHeight = 48.0;
        vec3 lightDir3D = vec3(toLight.x, toLight.y, (lightHeight - hSurf) * 8.0);
        vec3 L = normalize(lightDir3D);

        // 5. Dynamic Lambertian Hillshading from Moving Impact Point
        // Slopes facing the light catch radiant sun-drenched illumination (up to 1.95x)
        // Flat surfaces retain full 1.0x daylight radiance
        // Slopes facing away drop into deep topographical shadow (0.28x)
        float NdotL = dot(N, L);
        float directDiffuse = clamp(1.0 + NdotL * 1.35, 0.28, 1.95);

        // 6. Dynamic Horizon Occlusion & Mountain Elevation Cast Shadows (Raymarched heightfield)
        // Occludes valleys and coastlines that lie behind intervening mountain ridges
        float shadowOcclusion = 1.0;
        vec2 dirUV = (lPos - pixelCoord) / uResolution;

        for (int step = 1; step <= 8; step++) {
            float rayT = float(step) / 9.0;
            vec2 sampleUV = uv + dirUV * rayT;
            float intermediateElev = texture2D(iChannel1, sampleUV).a * 45.0;
            float lineOfSightElev = hSurf + (lightHeight - hSurf) * rayT;

            if (intermediateElev > lineOfSightElev + 0.18) {
                float block = clamp((intermediateElev - lineOfSightElev) * 0.85, 0.0, 1.0);
                shadowOcclusion = min(shadowOcclusion, 1.0 - block * 0.88);
            }
        }

        // Modulate hillshading by cast elevation shadow + soft ambient bounce
        float dynamicHillshade = directDiffuse * (0.30 + 0.70 * shadowOcclusion);

        // 7. Surface Illumination Composition
        vec3 litSurface;
        float surfaceAlpha;

        if (isLand) {
            // Land: reveal authentic daylight Mediterranean satellite terrain
            vec3 daylightSurface = dayTex.rgb * dynamicHillshade;

            // Authentic daylight satellite reveal with a subtle energetic brilliance
            vec3 energyTint = mix(vec3(1.0), lColor * 1.05, 0.10);
            vec3 mixedTerrain = daylightSurface * energyTint;

            // Specular glint on exposed limestone summits directly facing the point light
            float summitGlint = pow(max(0.0, NdotL), 12.0) * shadowOcclusion * (hSurf / 45.0) * 0.45;
            litSurface = mixedTerrain + lColor * summitGlint;

            // Opacity: high radiance across the broad region, smoothly dissipating towards zero at perimeter
            surfaceAlpha = clamp(smoothEdge * 1.25 * lIntensity, 0.0, 1.0);
        } else {
            // Sea: subtle deep Aegean water transparency around illuminated island coasts
            vec3 seaBase = mix(vec3(0.02, 0.08, 0.18), lColor * 0.70, 0.12);
            float seaWaveGlint = sin(uv.x * 280.0 + uv.y * 360.0) * 0.05 + 0.95;
            litSurface = seaBase * seaWaveGlint;

            // Water illumination remains deep and subtle, keeping focus on the landmasses
            float waterFalloff = pow(distanceFalloff, 2.0);
            surfaceAlpha = clamp(waterFalloff * 0.25 * lIntensity, 0.0, 0.30);
        }

        // Tightly focused contact glint at the collision point (does NOT bloom into an oversized cyan halo)
        float coreGlow = exp(-dist / 14.0) * 0.35 * lIntensity;
        vec3 halo = lColor * coreGlow;

        vec3 combinedColor = litSurface + halo;
        float finalAlpha = surfaceAlpha;

        // Premultiplied alpha accumulation (standard WebGL ONE, ONE_MINUS_SRC_ALPHA)
        totalPremulRGB += combinedColor * finalAlpha;
        totalAlpha = max(totalAlpha, finalAlpha);
    }

    gl_FragColor = vec4(totalPremulRGB, clamp(totalAlpha, 0.0, 1.0));
}
`;

export function createTerrainLightingBaseShader(
  worldWidth: number,
  worldHeight: number,
): Phaser.Display.BaseShader {
  return new Phaser.Display.BaseShader(
    TERRAIN_LIGHTING_SHADER_KEY,
    TERRAIN_LIGHTING_FRAG_SRC,
    TERRAIN_LIGHTING_VERT_SRC,
    {
      uResolution: { type: '2f', value: { x: worldWidth, y: worldHeight } },
      uLightCount: { type: '1i', value: 0 },
      uLight0: { type: '4f', value: { x: 0, y: 0, z: 0, w: 0 } },
      uLight1: { type: '4f', value: { x: 0, y: 0, z: 0, w: 0 } },
      uLight2: { type: '4f', value: { x: 0, y: 0, z: 0, w: 0 } },
      uLight3: { type: '4f', value: { x: 0, y: 0, z: 0, w: 0 } },
      uLightColor0: { type: '3f', value: { x: 1, y: 1, z: 1 } },
      uLightColor1: { type: '3f', value: { x: 1, y: 1, z: 1 } },
      uLightColor2: { type: '3f', value: { x: 1, y: 1, z: 1 } },
      uLightColor3: { type: '3f', value: { x: 1, y: 1, z: 1 } },
    },
  );
}
