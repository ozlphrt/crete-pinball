# Crete Pinball — Arena Geography & Map Projection Specification

**Status:** Authoritative Implementation Specification  
**Version:** 1.0  
**Phase:** Phase 01  

---

## 1. Geographic Bounding Extent

The playing arena encompasses the entire Aegean Sea basin:

| Boundary | Geographic Coordinate (WGS84) | Landform Context |
|---|---|---|
| **West ($\lambda_{min}$)** | $22.40^\circ \text{ E}$ | Peloponnese & Central Greece coast |
| **East ($\lambda_{max}$)** | $28.20^\circ \text{ E}$ | Turkish Anatolian Aegean coast & Rhodes |
| **South ($\phi_{min}$)** | $34.50^\circ \text{ N}$ | Mediterranean Sea south of Crete |
| **North ($\phi_{max}$)** | $41.30^\circ \text{ N}$ | Northern Greek & Turkish Aegean coastline |

Longitude span: $\Delta\lambda = 5.80^\circ$ ($\approx 0.10123$ radians).  
Latitude span: $\Delta\phi = 6.80^\circ$ ($\approx 0.11868$ radians).  

---

## 2. Mathematical Map Projection Pipeline

To preserve authentic geographical proportions, angles, and island shapes, **conformal Mercator projection** is employed. Naive equidistant latitude/longitude mapping would distort the east-west scale by $\cos(38^\circ) \approx 0.788$, squishing islands vertically by over 21%. Conformal Mercator guarantees that local angles and circular shapes are preserved identically in all directions.

### 2.1 Geographic to Metric Mercator ($y_{merc}$)
$$\text{lat}_{rad} = \frac{\phi \cdot \pi}{180}$$
$$y_{merc}(\phi) = \ln\left(\tan\left(\frac{\pi}{4} + \frac{\text{lat}_{rad}}{2}\right)\right)$$

At southern boundary ($\phi_{min} = 34.5^\circ$):
$$y_{merc}(34.5^\circ) = 0.64215 \text{ rad}$$

At northern boundary ($\phi_{max} = 41.3^\circ$):
$$y_{merc}(41.3^\circ) = 0.79354 \text{ rad}$$

$$\Delta y_{merc} = 0.79354 - 0.64215 = 0.15139 \text{ rad}$$

### 2.2 Metric Mercator to World Arena ($900 \times 1600$)
A single uniform metric scale factor $S$ maps radians to logical world units:
$$S = \frac{\text{contentHeight}}{\Delta y_{merc}} = \frac{1330}{0.15139} \approx 8785.25 \text{ world units / radian}$$

$$\text{contentWidth} = \Delta\lambda_{rad} \cdot S = 0.10123 \cdot 8785.25 \approx 889.3 \text{ world units}$$

$$\text{offsetX} = \frac{900 - 889.3}{2} \approx 5.35 \text{ world units}$$
$$\text{offsetY} = 120 \text{ world units (top HUD clearance)}$$

For any $(\lambda, \phi)$:
$$X_{world} = \text{offsetX} + (\lambda - \lambda_{min}) \cdot \frac{\pi}{180} \cdot S$$
$$Y_{world} = \text{offsetY} + (y_{merc}(\phi_{max}) - y_{merc}(\phi)) \cdot S$$

### 2.3 World Arena to Display Screen Pixels
Uniform aspect-preserving scale factor:
$$\text{scale} = \min\left(\frac{\text{screenWidth}}{900}, \frac{\text{screenHeight}}{1600}\right)$$
$$X_{screen} = X_{world} \cdot \text{scale} + \frac{\text{screenWidth} - 900 \cdot \text{scale}}{2}$$
$$Y_{screen} = Y_{world} \cdot \text{scale} + \frac{\text{screenHeight} - 1600 \cdot \text{scale}}{2}$$

The inverse transformation pipeline ($\text{Screen} \to \text{World} \to \text{Geo}$) is the exact mathematical inverse to floating-point precision.

### 2.4 Scale Variation Analysis & Geographical Accuracy Impact

The Mercator projection is strictly **conformal**, meaning that at any given point $(\lambda, \phi)$, the local linear scale factor is isotropic (identical in all directions: $k_x = k_y$). Consequently, infinitesimal and local shapes, coastal angles, and island silhouettes have **zero angular distortion, zero shear, and zero aspect-ratio elongation**.

However, by fundamental cartographic principles (Gauss's *Theorema Egregium*), no flat map of a spherical or ellipsoidal surface can be simultaneously conformal and equidistant across different latitudes. In the Mercator projection, the local linear scale factor $k(\phi)$ varies monotonically with latitude according to the secant function:
$$k(\phi) = \sec \phi = \frac{1}{\cos \phi}$$

#### Exact Scale Variation Across the Aegean Arena:
- **Southern Arena Boundary ($\phi_{\min} = 34.50^\circ\text{ N}$ — south of Crete):**
  $$k(34.50^\circ) = \frac{1}{\cos(34.50^\circ)} = \frac{1}{0.824126} \approx 1.2134$$
- **Crete Center Parallel ($\phi \approx 35.25^\circ\text{ N}$):**
  $$k(35.25^\circ) = \frac{1}{\cos(35.25^\circ)} = \frac{1}{0.816642} \approx 1.2245$$
- **Cyclades Central Parallel ($\phi_0 \approx 37.50^\circ\text{ N}$ — Naxos / Paros):**
  $$k(37.50^\circ) = \frac{1}{\cos(37.50^\circ)} = \frac{1}{0.793353} \approx 1.2605$$
- **Northern Arena Boundary ($\phi_{\max} = 41.30^\circ\text{ N}$ — Thracian Sea / Thasos):**
  $$k(41.30^\circ) = \frac{1}{\cos(41.30^\circ)} = \frac{1}{0.751264} \approx 1.3311$$

#### Measured Variation:
- **Maximum Linear Scale Ratio ($\text{North} / \text{South}$):**
  $$\frac{k(41.30^\circ)}{k(34.50^\circ)} = \frac{\cos(34.50^\circ)}{\cos(41.30^\circ)} = \frac{0.824126}{0.751264} \approx 1.0970 \quad (+9.70\%)$$
- **Crete to Northern Aegean Scale Ratio:**
  $$\frac{k(40.50^\circ\text{ [Thasos]})}{k(35.25^\circ\text{ [Crete]})} = \frac{0.816642}{0.760406} \approx 1.0740 \quad (+7.40\%)$$
- **Projected Area Scale Factor ($k^2 = \sec^2 \phi$):**
  $$\frac{k^2(41.30^\circ)}{k^2(34.50^\circ)} \approx (1.0970)^2 \approx 1.2033 \quad (+20.33\%)$$

#### Impact on Geographical Accuracy Requirements:
1. **Authentic Silhouette Preservation:** Individual island silhouettes (including Crete, Rhodes, Lesbos, and the Cycladic archipelago) suffer **zero directional squashing or skewing**. Because $k_x(\phi) = k_y(\phi)$ locally, coastlines, bays, and promontories retain their true physical proportions.
2. **Latitudinal Size Gradation:** Islands in the far north of the playfield (e.g., Thasos, Samothrace) appear linearly $\sim 7.4\%$ to $9.7\%$ larger relative to southern features (Crete) than they would on a true equidistant globe.
3. **Suitability for Pinball Physics:** For specular rebound and collision physics, conformality is paramount. An equal-area projection (such as Albers or Lambert Azimuthal) would cause converging curved meridians and non-orthogonal coordinate shear across the playfield, distorting ball ricochet angles and normal vectors. Mercator provides orthogonal rectilinear grids ($X$ corresponds to east-west and $Y$ to north-south everywhere in the arena) while preserving local coastline tangents and outward surface normals.

---

## 3. Arena Layout and Boundary Edge Contracts

```text
(0,0)                                              (900,0)
┌────────────────────────────────────────────────────────┐
│                      TOP HUD CLEARANCE                 │
├────────────────────────────────────────────────────────┤ Y = 120 (Arena Top)
│ [Mainland Greece]                              [Turkey]│
│ (Reflecting Wall)                      (Reflecting Wall│
│                                                        │
│                  ★ AEGEAN ISLANDS ★                    │
│                 (Scoring Targets)                      │
│                                                        │
│                                                        │
├────────────────────────────────────────────────────────┤ Y = 1000 (Lower Control Zone)
│                                                        │
│  ◀─────────── [CRETE DEFENSIVE PADDLE] ───────────▶    │ Y = 1460 (Crete Baseline)
│               (Horizontal Translation Only)            │
├────────────────────────────────────────────────────────┤ Y = 1580 (Southern Drain Line)
│              SOUTHERN ESCAPE / DRAIN ZONE              │
└────────────────────────────────────────────────────────┘ Y = 1600 (Arena Bottom)
```

1. **North, West, and East Open-Sea Edges:** Reflective boundaries. Where land touches the arena boundary (e.g., Peloponnese on the west, Turkey on the east), the land coastline forms the physical barrier.
2. **Crete Defensive Baseline ($Y = 1460$):**
   - Crete's natural centroid sits at $Y = 1460$.
   - Northern coast extends up to $Y \approx 1389$.
   - Southern coast extends down to $Y \approx 1531$.
3. **Southern Drain Boundary ($Y = 1580$):**
   - Sits $49$ world units south of Crete's southernmost shore.
   - Balls that slip past Crete can travel into the open water behind Crete and ricochet against its southern shore. A ball is lost only when its entire collision core crosses $Y \ge 1580$.

---

## 4. Crete Motion Invariants

1. **Rigid Translation:** Crete translates along world X only: $Y \equiv 1460$, $\theta \equiv 0^\circ$.
2. **Full Silhouette Visibility:**
   - Crete half-width: $W_{half} \approx 216$ world units.
   - Travel limits: $X_{min} \approx 216$, $X_{max} \approx 684$.
   - At both extremes, neither tip of Crete ever exits the visible 900-unit playing field.
3. **Speed Limit:** Maximum speed $1100$ world units/second. Instantaneous stop on touch release with zero residual glide.

End of File
