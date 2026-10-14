import { SupportedLocale } from '../types';

export type TranslationKey =
  | 'app.title'
  | 'app.subtitle'
  | 'menu.play'
  | 'menu.resume'
  | 'menu.explore'
  | 'menu.achievements'
  | 'menu.settings'
  | 'menu.version'
  | 'game.placeholderNotice'
  | 'game.gridNotice'
  | 'game.backToMenu'
  | 'game.pause'
  | 'game.resume'
  | 'game.paused'
  | 'game.southernDrain'
  | 'game.creteZone'
  | 'game.crete'
  | 'orientation.rotatePrompt'
  // HUD
  | 'hud.score'
  | 'hud.target'
  | 'hud.normal'
  | 'hud.armed'
  | 'hud.ready'
  | 'hud.multiball'
  | 'hud.slowmo'
  | 'hud.weather'
  | 'hud.balls'
  // Settings & Menu
  | 'settings.title'
  | 'settings.close'
  | 'settings.language'
  | 'settings.difficulty'
  | 'settings.theme'
  | 'settings.sound'
  | 'settings.music'
  | 'settings.sfxVolume'
  | 'settings.ambienceVolume'
  | 'settings.musicVolume'
  | 'settings.mute'
  | 'settings.reducedMotion'
  | 'settings.highContrast'
  | 'settings.graphicsQuality'
  | 'settings.replayTutorial'
  | 'settings.restartGame'
  | 'settings.resumeGame'
  // Tutorial
  | 'tutorial.title'
  | 'tutorial.skip'
  | 'tutorial.next'
  | 'tutorial.gotit'
  | 'tutorial.step1.title'
  | 'tutorial.step1.desc'
  | 'tutorial.step2.title'
  | 'tutorial.step2.desc'
  | 'tutorial.step3.title'
  | 'tutorial.step3.desc'
  | 'tutorial.step4.title'
  | 'tutorial.step4.desc'
  | 'tutorial.step5.title'
  | 'tutorial.step5.desc'
  | 'tutorial.step6.title'
  | 'tutorial.step6.desc'
  | 'tutorial.step7.title'
  | 'tutorial.step7.desc'
  // Results & Notices
  | 'results.gameOver'
  | 'results.finalScore'
  | 'results.newHighScore'
  | 'results.newRecord'
  | 'results.survivalTime'
  | 'results.islandsDiscovered'
  | 'results.islandHits'
  | 'results.distinct'
  | 'results.maxCombo'
  | 'results.playAgain'
  | 'results.share'
  | 'results.atlas'
  | 'notice.extraBall'
  | 'notice.powerArmed'
  // Atlas
  | 'atlas.title'
  | 'atlas.discovered'
  | 'atlas.undiscovered'
  | 'atlas.islet'
  | 'atlas.hits'
  | 'atlas.points'
  | 'atlas.firstVisit'
  | 'atlas.back'
  | 'atlas.resetView'
  // Achievements
  | 'achievements.galleryTitle'
  | 'achievements.unlocked'
  | 'achievements.locked'
  | 'achievements.firstContact.title'
  | 'achievements.firstContact.desc'
  | 'achievements.comboStarter.title'
  | 'achievements.comboStarter.desc'
  | 'achievements.comboApprentice.title'
  | 'achievements.comboApprentice.desc'
  | 'achievements.comboMaster.title'
  | 'achievements.comboMaster.desc'
  | 'achievements.mariner60.title'
  | 'achievements.mariner60.desc'
  | 'achievements.endurance180.title'
  | 'achievements.endurance180.desc'
  | 'achievements.score5k.title'
  | 'achievements.score5k.desc'
  | 'achievements.score15k.title'
  | 'achievements.score15k.desc'
  | 'achievements.score30k.title'
  | 'achievements.score30k.desc'
  | 'achievements.cycladesExplorer.title'
  | 'achievements.cycladesExplorer.desc'
  | 'achievements.dodecaneseVoyager.title'
  | 'achievements.dodecaneseVoyager.desc'
  | 'achievements.northOutpost.title'
  | 'achievements.northOutpost.desc'
  | 'achievements.santoriniEruption.title'
  | 'achievements.santoriniEruption.desc'
  | 'achievements.rhodesColossus.title'
  | 'achievements.rhodesColossus.desc'
  | 'achievements.mykonosTempest.title'
  | 'achievements.mykonosTempest.desc'
  | 'achievements.multiballStorm.title'
  | 'achievements.multiballStorm.desc'
  | 'achievements.powerRebound.title'
  | 'achievements.powerRebound.desc'
  | 'achievements.islandCartographer.title'
  | 'achievements.islandCartographer.desc'
  | 'achievements.islandMaster.title'
  | 'achievements.islandMaster.desc'
  | 'achievements.weatherSurvivor.title'
  | 'achievements.weatherSurvivor.desc'
  // Analytics & Backup
  | 'analytics.title'
  | 'analytics.saveRate'
  | 'backup.export'
  | 'backup.import'
  // Weather
  | 'weather.meltemi'
  | 'weather.crosswind'
  | 'weather.calm'
  // Difficulty
  | 'difficulty.easy'
  | 'difficulty.normal'
  | 'difficulty.hard';

export const TRANSLATIONS: Record<SupportedLocale, Record<TranslationKey, string>> = {
  en: {
    'app.title': 'Crete Pinball',
    'app.subtitle': 'The Aegean Sea is the playfield',
    'menu.play': 'Play Game',
    'menu.resume': 'Resume Game',
    'menu.explore': 'Explore Aegean',
    'menu.achievements': 'Achievements',
    'menu.settings': 'Settings',
    'menu.version': 'Crete Pinball Arcade',
    'game.placeholderNotice': 'Authentic Aegean Geography & Crete Movement',
    'game.gridNotice': 'AUTHENTIC GEOGRAPHY — NATURAL EARTH 1:10M',
    'game.backToMenu': 'Main Menu',
    'game.pause': 'Pause',
    'game.resume': 'Resume',
    'game.paused': 'GAME PAUSED',
    'game.southernDrain': 'SOUTHERN DRAIN LINE (Y: 1580)',
    'game.creteZone': 'CRETE DEFENSIVE ZONE (Y: 1460)',
    'game.crete': 'CRETE',
    'orientation.rotatePrompt': 'Please rotate your device to portrait orientation',
    // HUD
    'hud.score': 'SCORE',
    'hud.target': 'TARGET',
    'hud.normal': 'NORMAL',
    'hud.armed': 'ARMED!',
    'hud.ready': 'READY',
    'hud.multiball': '3-BALL',
    'hud.slowmo': 'SLOW-MO',
    'hud.weather': 'WEATHER',
    'hud.balls': 'BALLS',
    // Settings
    'settings.title': 'SETTINGS',
    'settings.close': 'CLOSE',
    'settings.language': 'Language',
    'settings.difficulty': 'Difficulty',
    'settings.theme': 'Visual Theme',
    'settings.sound': 'Sound Effects',
    'settings.music': 'Music',
    'settings.sfxVolume': 'SFX Volume',
    'settings.ambienceVolume': 'Sea Ambience',
    'settings.musicVolume': 'Music Volume',
    'settings.mute': 'Mute',
    'settings.reducedMotion': 'Reduced Motion',
    'settings.highContrast': 'High Contrast',
    'settings.graphicsQuality': 'Graphics Quality',
    'settings.replayTutorial': 'How to Play (Tutorial)',
    'settings.restartGame': 'Restart Game',
    'settings.resumeGame': 'Resume Game',
    // Tutorial
    'tutorial.title': 'HOW TO PLAY',
    'tutorial.skip': 'SKIP',
    'tutorial.next': 'NEXT',
    'tutorial.gotit': 'PLAY!',
    'tutorial.step1.title': 'NORTHERN ENTRANCE',
    'tutorial.step1.desc': 'The nautical ball enters from the northern Aegean waters.',
    'tutorial.step2.title': 'MOVE CRETE',
    'tutorial.step2.desc': 'Drag horizontally in the lower zone to steer Crete.',
    'tutorial.step3.title': 'BOUNCE NORTHWARD',
    'tutorial.step3.desc':
      "Intercept the ball along Crete's northern shoreline to bounce it into the islands.",
    'tutorial.step4.title': 'SCORING & COMBOS',
    'tutorial.step4.desc': 'Hit different islands to build your multiplier up to ×5!',
    'tutorial.step5.title': 'BONUS TARGETS',
    'tutorial.step5.desc': 'Hit the glowing target island for substantial bonus points.',
    'tutorial.step6.title': 'CHARGED POWER BOUNCE',
    'tutorial.step6.desc': 'Double-tap when the energy bar is full for a supercharged rebound!',
    'tutorial.step7.title': 'SOUTHERN DRAIN',
    'tutorial.step7.desc': 'Defend the baseline! Do not let the ball escape south of Crete.',
    // Results & Notices
    'results.gameOver': 'GAME OVER',
    'results.finalScore': 'Final Score',
    'results.newHighScore': 'NEW HIGH SCORE!',
    'results.newRecord': 'NEW PERSONAL RECORD!',
    'results.survivalTime': 'Survival Time',
    'results.islandsDiscovered': 'Islands Discovered',
    'results.islandHits': 'Island Hits',
    'results.distinct': 'distinct',
    'results.maxCombo': 'Max Combo',
    'results.playAgain': 'PLAY AGAIN',
    'results.share': 'Share',
    'results.atlas': 'Atlas',
    'notice.extraBall': '🌟 EXTRA BALL EARNED!',
    'notice.powerArmed': '⚡ POWER BOUNCE ARMED!',
    // Atlas
    'atlas.title': 'AEGEAN GEOGRAPHY ATLAS',
    'atlas.discovered': 'DISCOVERED',
    'atlas.undiscovered': 'UNDISCOVERED',
    'atlas.islet': 'DECORATIVE ISLET',
    'atlas.hits': 'Hits',
    'atlas.points': 'Points',
    'atlas.firstVisit': 'First Visit',
    'atlas.back': 'Back',
    'atlas.resetView': 'Reset View',
    // Achievements
    'achievements.galleryTitle': 'AEGEAN ACHIEVEMENTS',
    'achievements.unlocked': 'UNLOCKED',
    'achievements.locked': 'LOCKED',
    'achievements.firstContact.title': 'First Splash',
    'achievements.firstContact.desc': 'Hit your first island in the Aegean archipelago.',
    'achievements.comboStarter.title': 'Winds of Chios',
    'achievements.comboStarter.desc': 'Reach a combo multiplier of ×2.',
    'achievements.comboApprentice.title': 'Cycladic Chain',
    'achievements.comboApprentice.desc': 'Reach a combo multiplier of ×3.',
    'achievements.comboMaster.title': 'Aegean Maestro',
    'achievements.comboMaster.desc': 'Reach the maximum combo multiplier of ×5.',
    'achievements.mariner60.title': 'Aegean Mariner',
    'achievements.mariner60.desc': 'Survive for at least 60 seconds in a single run.',
    'achievements.endurance180.title': 'Odyssey Navigator',
    'achievements.endurance180.desc': 'Survive for at least 180 seconds in a single run.',
    'achievements.score5k.title': 'Harbor Trader',
    'achievements.score5k.desc': 'Score 5,000 points in a single run.',
    'achievements.score15k.title': 'Merchant Captain',
    'achievements.score15k.desc': 'Score 15,000 points in a single run.',
    'achievements.score30k.title': 'Naval Sovereign',
    'achievements.score30k.desc': 'Score 30,000 points in a single run.',
    'achievements.cycladesExplorer.title': 'Cyclades Wanderer',
    'achievements.cycladesExplorer.desc': 'Hit 5 distinct islands in the Cyclades group.',
    'achievements.dodecaneseVoyager.title': 'Dodecanese Crossing',
    'achievements.dodecaneseVoyager.desc': 'Hit both Rhodes and Kos in the Dodecanese.',
    'achievements.northOutpost.title': 'Northern Watch',
    'achievements.northOutpost.desc': 'Hit Thasos, Samothrace, or Lemnos in the North Aegean.',
    'achievements.santoriniEruption.title': 'Minoan Eruption',
    'achievements.santoriniEruption.desc': 'Trigger the Santorini explosive caldera ability.',
    'achievements.rhodesColossus.title': 'Colossus Guardian',
    'achievements.rhodesColossus.desc': 'Trigger the Rhodes speed boost ability.',
    'achievements.mykonosTempest.title': 'Windmill Gale',
    'achievements.mykonosTempest.desc': 'Trigger the Mykonos score multiplier ability.',
    'achievements.multiballStorm.title': 'Triple Tempest',
    'achievements.multiballStorm.desc': 'Trigger a 3-ball multiball session.',
    'achievements.powerRebound.title': 'Spartan Defense',
    'achievements.powerRebound.desc': 'Fire a charged Crete power bounce.',
    'achievements.islandCartographer.title': 'Aegean Cartographer',
    'achievements.islandCartographer.desc': 'Discover 25 unique islands across lifetime play.',
    'achievements.islandMaster.title': 'Archipelago Master',
    'achievements.islandMaster.desc': 'Discover 50 unique islands across lifetime play.',
    'achievements.weatherSurvivor.title': 'Meltemi Veteran',
    'achievements.weatherSurvivor.desc': 'Survive an active Meltemi storm without losing a life.',
    // Analytics & Backup
    'analytics.title': 'DEVELOPER ANALYTICS DASHBOARD',
    'analytics.saveRate': 'Save Rate',
    'backup.export': 'Export Backup',
    'backup.import': 'Restore Backup',
    // Weather
    'weather.meltemi': 'Meltemi Wind: Strong Southward Gale',
    'weather.crosswind': 'Crosswind: Lateral Aegean Breeze',
    'weather.calm': 'Calm Waters: Reduced Gravity & Still Seas',
    // Difficulty
    'difficulty.easy': 'Easy',
    'difficulty.normal': 'Normal',
    'difficulty.hard': 'Hard',
  },
  tr: {
    'app.title': 'Girit Pinball',
    'app.subtitle': 'Ege Denizi oyun alanınızdır',
    'menu.play': 'Oyuna Başla',
    'menu.resume': 'Devam Et',
    'menu.explore': 'Egeyi Keşfet',
    'menu.achievements': 'Başarımlar',
    'menu.settings': 'Ayarlar',
    'menu.version': 'Girit Pinball Arcade',
    'game.placeholderNotice': 'Otantik Ege Coğrafyası ve Girit Hareketi',
    'game.gridNotice': 'OTANTİK COĞRAFYA — NATURAL EARTH 1:10M',
    'game.backToMenu': 'Ana Menü',
    'game.pause': 'Duraklat',
    'game.resume': 'Devam Et',
    'game.paused': 'OYUN DURAKLATILDI',
    'game.southernDrain': 'GÜNEY ÇIKIŞ ÇİZGİSİ (Y: 1580)',
    'game.creteZone': 'GİRİT SAVUNMA HATTI (Y: 1460)',
    'game.crete': 'GİRİT',
    'orientation.rotatePrompt': 'Lütfen cihazınızı dikey konuma çevirin',
    // HUD
    'hud.score': 'SKOR',
    'hud.target': 'HEDEF',
    'hud.normal': 'NORMAL',
    'hud.armed': 'HAZIR!',
    'hud.ready': 'HAZIR',
    'hud.multiball': '3-TOP',
    'hud.slowmo': 'AĞIR ÇEKİM',
    'hud.weather': 'HAVA',
    'hud.balls': 'TOPLAR',
    // Settings
    'settings.title': 'AYARLAR',
    'settings.close': 'KAPAT',
    'settings.language': 'Dil',
    'settings.difficulty': 'Zorluk',
    'settings.theme': 'Görsel Tema',
    'settings.sound': 'Ses Efektleri',
    'settings.music': 'Müzik',
    'settings.sfxVolume': 'Ses Efektleri',
    'settings.ambienceVolume': 'Deniz Ambiyansı',
    'settings.musicVolume': 'Müzik',
    'settings.mute': 'Sessiz',
    'settings.reducedMotion': 'Hareketi Azalt',
    'settings.highContrast': 'Yüksek Kontrast',
    'settings.graphicsQuality': 'Grafik Kalitesi',
    'settings.replayTutorial': 'Nasıl Oynanır (Eğitim)',
    'settings.restartGame': 'Yeniden Başlat',
    'settings.resumeGame': 'Oyuna Devam Et',
    // Tutorial
    'tutorial.title': 'NASIL OYNANIR',
    'tutorial.skip': 'ATLA',
    'tutorial.next': 'İLERİ',
    'tutorial.gotit': 'BAŞLA!',
    'tutorial.step1.title': 'KUZEY GİRİŞİ',
    'tutorial.step1.desc': "Denizci topu kuzey Ege'den oyuna girer.",
    'tutorial.step2.title': "GİRİT'İ HAREKET ETTİR",
    'tutorial.step2.desc': 'Girit adasını yönlendirmek için alt kısımda parmağınızı kaydırın.',
    'tutorial.step3.title': 'KUZEYE SEKTİR',
    'tutorial.step3.desc': "Topu adalar arasına fırlatmak için Girit'in kuzey kıyısıyla yakalayın.",
    'tutorial.step4.title': 'SKOR VE KOMBOLAR',
    'tutorial.step4.desc': "Çarpanınızı ×5'e kadar yükseltmek için farklı adalara çarpın!",
    'tutorial.step5.title': 'BONUS HEDEFLER',
    'tutorial.step5.desc': 'Büyük bonus puanlar kazanmak için işaretli hedef adayı vurun.',
    'tutorial.step6.title': 'GÜÇLÜ VURUŞ',
    'tutorial.step6.desc': 'Enerji çubuğunuz dolduğunda güçlü vuruş için ekrana çift dokunun!',
    'tutorial.step7.title': 'GÜNEY SINIRI',
    'tutorial.step7.desc': "Topun Girit'in altından güney sularına düşmesine izin vermeyin!",
    // Results & Notices
    'results.gameOver': 'OYUN BİTTİ',
    'results.finalScore': 'Son Skor',
    'results.newHighScore': 'YENİ REKOR!',
    'results.newRecord': 'YENİ KİŞİSEL REKOR!',
    'results.survivalTime': 'Hayatta Kalma Süresi',
    'results.islandsDiscovered': 'Keşfedilen Adalar',
    'results.islandHits': 'Ada Vuruşları',
    'results.distinct': 'farklı',
    'results.maxCombo': 'En Yüksek Kombo',
    'results.playAgain': 'TEKRAR OYNA',
    'results.share': 'Paylaş',
    'results.atlas': 'Atlas',
    'notice.extraBall': '🌟 EKSTRA TOP KAZANILDI!',
    'notice.powerArmed': '⚡ GÜÇLÜ VURUŞ HAZIR!',
    // Atlas
    'atlas.title': 'EGE COĞRAFYA ATLASI',
    'atlas.discovered': 'KEŞFEDİLDİ',
    'atlas.undiscovered': 'KEŞFEDİLMEDİ',
    'atlas.islet': 'DEKORATİF ADACIK',
    'atlas.hits': 'Vuruş',
    'atlas.points': 'Puan',
    'atlas.firstVisit': 'İlk Ziyaret',
    'atlas.back': 'Geri',
    'atlas.resetView': 'Görünümü Sıfırla',
    // Achievements
    'achievements.galleryTitle': 'EGE BAŞARIMLARI',
    'achievements.unlocked': 'AÇILDI',
    'achievements.locked': 'KİLİTLİ',
    'achievements.firstContact.title': 'İlk Dalış',
    'achievements.firstContact.desc': 'Ege adalarından birine ilk kez çarpın.',
    'achievements.comboStarter.title': 'Sakız Rüzgarı',
    'achievements.comboStarter.desc': 'Kombo çarpanını ×2 seviyesine ulaştırın.',
    'achievements.comboApprentice.title': 'Kiklad Zinciri',
    'achievements.comboApprentice.desc': 'Kombo çarpanını ×3 seviyesine ulaştırın.',
    'achievements.comboMaster.title': 'Ege Ustası',
    'achievements.comboMaster.desc': 'Maksimum kombo çarpanı olan ×5 seviyesine ulaşın.',
    'achievements.mariner60.title': 'Ege Denizcisi',
    'achievements.mariner60.desc': 'Tek bir oyunda en az 60 saniye hayatta kalın.',
    'achievements.endurance180.title': 'Odysseia Kaptanı',
    'achievements.endurance180.desc': 'Tek bir oyunda en az 180 saniye hayatta kalın.',
    'achievements.score5k.title': 'Liman Tüccarı',
    'achievements.score5k.desc': 'Tek bir oyunda 5.000 puan kazanın.',
    'achievements.score15k.title': 'Ticaret Kaptanı',
    'achievements.score15k.desc': 'Tek bir oyunda 15.000 puan kazanın.',
    'achievements.score30k.title': 'Deniz Hükümdarı',
    'achievements.score30k.desc': 'Tek bir oyunda 30.000 puan kazanın.',
    'achievements.cycladesExplorer.title': 'Kiklad Gezgini',
    'achievements.cycladesExplorer.desc': 'Kiklad grubundan 5 farklı adaya çarpın.',
    'achievements.dodecaneseVoyager.title': 'Onikiada Geçişi',
    'achievements.dodecaneseVoyager.desc':
      'Onikiada grubunda hem Rodos hem de İstanköy adasını vurun.',
    'achievements.northOutpost.title': 'Kuzey Nöbeti',
    'achievements.northOutpost.desc':
      'Kuzey Ege adalarından Taşoz, Semadirek veya Limni adasını vurun.',
    'achievements.santoriniEruption.title': 'Minos Patlaması',
    'achievements.santoriniEruption.desc': 'Santorini kalderasının patlayıcı gücünü etkinleştirin.',
    'achievements.rhodesColossus.title': 'Rodos Muhafızı',
    'achievements.rhodesColossus.desc': 'Rodos adasının hız artırma yeteneğini etkinleştirin.',
    'achievements.mykonosTempest.title': 'Değirmen Fırtınası',
    'achievements.mykonosTempest.desc': 'Mikonos adasının skor çarpanı yeteneğini etkinleştirin.',
    'achievements.multiballStorm.title': 'Üçlü Fırtına',
    'achievements.multiballStorm.desc': '3 toplu çoklu top seansını başlatın.',
    'achievements.powerRebound.title': 'Sparta Savunması',
    'achievements.powerRebound.desc': 'Girit ile enerjili güçlü vuruş gerçekleştirin.',
    'achievements.islandCartographer.title': 'Ege Haritacısı',
    'achievements.islandCartographer.desc': 'Toplamda 25 farklı adayı keşfedin.',
    'achievements.islandMaster.title': 'Takımada Efendisi',
    'achievements.islandMaster.desc': 'Toplamda 50 farklı adayı keşfedin.',
    'achievements.weatherSurvivor.title': 'Meltemi Gazisi',
    'achievements.weatherSurvivor.desc': 'Can kaybetmeden aktif bir Meltemi fırtınasını atlatın.',
    // Analytics & Backup
    'analytics.title': 'GELİŞTİRİCİ ANALİTİK PANELİ',
    'analytics.saveRate': 'Kurtarma Oranı',
    'backup.export': 'Yedeği Dışa Aktar',
    'backup.import': 'Yedeği İçe Aktar',
    // Weather
    'weather.meltemi': 'Meltemi Rüzgarı: Kuvvetli Güneye Esen Fırtına',
    'weather.crosswind': 'Yan Rüzgar: Yanal Ege Esintisi',
    'weather.calm': 'Durgun Deniz: Düşük Çekim ve Sakin Su',
    // Difficulty
    'difficulty.easy': 'Kolay',
    'difficulty.normal': 'Normal',
    'difficulty.hard': 'Zor',
  },
  el: {
    'app.title': 'Κρήτη Φλίπερ',
    'app.subtitle': 'Το Αιγαίο Πέλαγος είναι το πεδίο παιχνιδιού',
    'menu.play': 'Έναρξη Παιχνιδιού',
    'menu.resume': 'Συνέχεια',
    'menu.explore': 'Εξερεύνηση Αιγαίου',
    'menu.achievements': 'Επιτεύγματα',
    'menu.settings': 'Ρυθμίσεις',
    'menu.version': 'Κρήτη Φλίπερ Arcade',
    'game.placeholderNotice': 'Αυθεντική Γεωγραφία Αιγαίου & Κίνηση Κρήτης',
    'game.gridNotice': 'ΑΥΘΕΝΤΙΚΑ ΓΕΩΓΡΑΦΙΚΑ ΔΕΔΟΜΕΝΑ — NATURAL EARTH 1:10M',
    'game.backToMenu': 'Κύριο Μενού',
    'game.pause': 'Παύση',
    'game.resume': 'Συνέχεια',
    'game.paused': 'ΠΑΥΣΗ ΠΑΙΧΝΙΔΙΟΥ',
    'game.southernDrain': 'ΝΟΤΙΑ ΓΡΑΜΜΗ ΕΞΟΔΟΥ (Y: 1580)',
    'game.creteZone': 'ΑΜΥΝΤΙΚΗ ΖΩΝΗ ΚΡΗΤΗΣ (Y: 1460)',
    'game.crete': 'ΚΡΗΤΗ',
    'orientation.rotatePrompt':
      'Παρακαλούμε περιστρέψτε τη συσκευή σας σε κατακόρυφο προσανατολισμό',
    // HUD
    'hud.score': 'ΣΚΟΡ',
    'hud.target': 'ΣΤΟΧΟΣ',
    'hud.normal': 'ΚΑΝΟΝΙΚΟ',
    'hud.armed': 'ΕΤΟΙΜΟ!',
    'hud.ready': 'ΕΤΟΙΜΟ',
    'hud.multiball': '3 ΜΠΑΛΕΣ',
    'hud.slowmo': 'ΑΡΓΗ ΚΙΝΗΣΗ',
    'hud.weather': 'ΚΑΙΡΟΣ',
    'hud.balls': 'ΜΠΑΛΕΣ',
    // Settings
    'settings.title': 'ΡΥΘΜΙΣΕΙΣ',
    'settings.close': 'ΚΛΕΙΣΙΜΟ',
    'settings.language': 'Γλώσσα',
    'settings.difficulty': 'Δυσκολία',
    'settings.theme': 'Θέμα',
    'settings.sound': 'Ηχητικά Εφέ',
    'settings.music': 'Μουσική',
    'settings.sfxVolume': 'Ηχητικά Εφέ',
    'settings.ambienceVolume': 'Θαλάσσιο Περιβάλλον',
    'settings.musicVolume': 'Μουσική',
    'settings.mute': 'Σίγαση',
    'settings.reducedMotion': 'Μειωμένη Κίνηση',
    'settings.highContrast': 'Υψηλή Αντίθεση',
    'settings.graphicsQuality': 'Ποιότητα Γραφικών',
    'settings.replayTutorial': 'Πώς να παίξετε (Εκμάθηση)',
    'settings.restartGame': 'Επανεκκίνηση',
    'settings.resumeGame': 'Συνέχεια Παιχνιδιού',
    // Tutorial
    'tutorial.title': 'ΠΩΣ ΝΑ ΠΑΙΞΕΤΕ',
    'tutorial.skip': 'ΠΑΡΑΛΕΙΨΗ',
    'tutorial.next': 'ΕΠΟΜΕΝΟ',
    'tutorial.gotit': 'ΠΑΙΞΤΕ!',
    'tutorial.step1.title': 'ΒΟΡΕΙΑ ΕΙΣΟΔΟΣ',
    'tutorial.step1.desc': 'Η ναυτική μπάλα εισέρχεται από το βόρειο Αιγαίο στο παιχνίδι.',
    'tutorial.step2.title': 'ΚΙΝΗΣΤΕ ΤΗΝ ΚΡΗΤΗ',
    'tutorial.step2.desc': 'Σύρετε οριζόντια στο κάτω μέρος για να κατευθύνετε την Κρήτη.',
    'tutorial.step3.title': 'ΑΝΑΠΗΔΗΣΤΕ ΒΟΡΕΙΑ',
    'tutorial.step3.desc':
      'Αναχαιτίστε τη μπάλα στη βόρεια ακτή της Κρήτης για να την αναπηδήσετε στα νησιά.',
    'tutorial.step4.title': 'ΣΚΟΡ & ΣΥΝΔΥΑΣΜΟΙ',
    'tutorial.step4.desc': 'Χτυπήστε διαφορετικά νησιά για να αυξήσετε τον πολλαπλασιαστή έως ×5!',
    'tutorial.step5.title': 'ΣΤΟΧΟΙ ΜΠΟΝΟΥΣ',
    'tutorial.step5.desc': 'Χτυπήστε το επισημασμένο νησί-στόχο για μεγάλα μπόνους!',
    'tutorial.step6.title': 'ΕΝΙΣΧΥΜΕΝΗ ΑΝΑΠΗΔΗΣΗ',
    'tutorial.step6.desc': 'Πατήστε δύο φορές όταν η μπάρα είναι γεμάτη για σούπερ αναπήδηση!',
    'tutorial.step7.title': 'ΝΟΤΙΟ ΣΥΝΟΡΟ',
    'tutorial.step7.desc': 'Μην αφήσετε τη μπάλα να διαφύγει νότια πέρα από την Κρήτη!',
    // Results & Notices
    'results.gameOver': 'ΤΕΛΟΣ ΠΑΙΧΝΙΔΙΟΥ',
    'results.finalScore': 'Τελικό Σκορ',
    'results.newHighScore': 'ΝΕΟ ΡΕΚΟΡ!',
    'results.newRecord': 'ΝΕΟ ΠΡΟΣΩΠΙΚΟ ΡΕΚΟΡ!',
    'results.survivalTime': 'Χρόνος Επιβίωσης',
    'results.islandsDiscovered': 'Νησιά που Ανακαλύφθηκαν',
    'results.islandHits': 'Χτυπήματα Νησιών',
    'results.distinct': 'διαφορετικά',
    'results.maxCombo': 'Μέγιστος Συνδυασμός',
    'results.playAgain': 'ΠΑΙΞΤΕ ΞΑΝΑ',
    'results.share': 'Κοινοποίηση',
    'results.atlas': 'Άτλας',
    'notice.extraBall': '🌟 ΚΕΡΔΙΣΑΤΕ ΕΞΤΡΑ ΜΠΑΛΑ!',
    'notice.powerArmed': '⚡ ΕΝΙΣΧΥΜΕΝΗ ΑΝΑΠΗΔΗΣΗ ΕΤΟΙΜΗ!',
    // Atlas
    'atlas.title': 'ΓΕΩΓΡΑΦΙΚΟΣ ΑΤΛΑΣ ΑΙΓΑΙΟΥ',
    'atlas.discovered': 'ΑΝΑΚΑΛΥΦΘΗΚΕ',
    'atlas.undiscovered': 'ΑΝΕΞΕΡΕΥΝΗΤΟ',
    'atlas.islet': 'ΔΙΑΚΟΣΜΗΤΙΚΗ ΒΡΑΧΟΝΗΣΙΔΑ',
    'atlas.hits': 'Χτυπήματα',
    'atlas.points': 'Πόντοι',
    'atlas.firstVisit': 'Πρώτη Επίσκεψη',
    'atlas.back': 'Πίσω',
    'atlas.resetView': 'Επαναφορά Προβολής',
    // Achievements
    'achievements.galleryTitle': 'ΕΠΙΤΕΥΓΜΑΤΑ ΑΙΓΑΙΟΥ',
    'achievements.unlocked': 'ΞΕΚΛΕΙΔΩΘΗΚΕ',
    'achievements.locked': 'ΚΛΕΙΔΩΜΕΝΟ',
    'achievements.firstContact.title': 'Πρώτη Βουτιά',
    'achievements.firstContact.desc': 'Χτυπήστε το πρώτο σας νησί στο Αιγαίο.',
    'achievements.comboStarter.title': 'Άνεμος της Χίου',
    'achievements.comboStarter.desc': 'Φτάστε πολλαπλασιαστή συνδυασμού ×2.',
    'achievements.comboApprentice.title': 'Κυκλαδική Αλυσίδα',
    'achievements.comboApprentice.desc': 'Φτάστε πολλαπλασιαστή συνδυασμού ×3.',
    'achievements.comboMaster.title': 'Μαέστρος του Αιγαίου',
    'achievements.comboMaster.desc': 'Φτάστε τον μέγιστο πολλαπλασιαστή συνδυασμού ×5.',
    'achievements.mariner60.title': 'Αιγαιοπελαγίτης Ναυτικός',
    'achievements.mariner60.desc': 'Επιβιώστε για τουλάχιστον 60 δευτερόλεπτα σε ένα παιχνίδι.',
    'achievements.endurance180.title': 'Πλοηγός της Οδύσσειας',
    'achievements.endurance180.desc': 'Επιβιώστε για τουλάχιστον 180 δευτερόλεπτα σε ένα παιχνίδι.',
    'achievements.score5k.title': 'Έμπορος Λιμένος',
    'achievements.score5k.desc': 'Συγκεντρώστε 5.000 πόντους σε ένα παιχνίδι.',
    'achievements.score15k.title': 'Καπετάνιος Εμπορικού',
    'achievements.score15k.desc': 'Συγκεντρώστε 15.000 πόντους σε ένα παιχνίδι.',
    'achievements.score30k.title': 'Κυρίαρχος των Θαλασσών',
    'achievements.score30k.desc': 'Συγκεντρώστε 30.000 πόντους σε ένα παιχνίδι.',
    'achievements.cycladesExplorer.title': 'Εξερευνητής Κυκλάδων',
    'achievements.cycladesExplorer.desc': 'Χτυπήστε 5 διαφορετικά νησιά των Κυκλάδων.',
    'achievements.dodecaneseVoyager.title': 'Διάπλους Δωδεκανήσου',
    'achievements.dodecaneseVoyager.desc': 'Χτυπήστε τη Ρόδο και την Κω στα Δωδεκάνησα.',
    'achievements.northOutpost.title': 'Βόρεια Φρουρά',
    'achievements.northOutpost.desc': 'Χτυπήστε τη Θάσο, τη Σαμοθράκη ή τη Λήμνο.',
    'achievements.santoriniEruption.title': 'Μινωική Έκρηξη',
    'achievements.santoriniEruption.desc': 'Ενεργοποιήστε την εκρηκτική καλντέρα της Σαντορίνης.',
    'achievements.rhodesColossus.title': 'Φύλακας Κολοσσός',
    'achievements.rhodesColossus.desc': 'Ενεργοποιήστε την επιτάχυνση της Ρόδου.',
    'achievements.mykonosTempest.title': 'Ανεμοστρόβιλος Μυκόνου',
    'achievements.mykonosTempest.desc': 'Ενεργοποιήστε τον πολλαπλασιαστή σκορ της Μυκόνου.',
    'achievements.multiballStorm.title': 'Τριπλή Καταιγίδα',
    'achievements.multiballStorm.desc': 'Ενεργοποιήστε παιχνίδι με 3 μπάλες.',
    'achievements.powerRebound.title': 'Σπαρτιατική Άμυνα',
    'achievements.powerRebound.desc': 'Εκτελέστε ενισχυμένη αναπήδηση με την Κρήτη.',
    'achievements.islandCartographer.title': 'Χαρτογράφος Αιγαίου',
    'achievements.islandCartographer.desc': 'Ανακαλύψτε 25 μοναδικά νησιά συνολικά.',
    'achievements.islandMaster.title': 'Άρχοντας του Αρχιπελάγους',
    'achievements.islandMaster.desc': 'Ανακαλύψτε 50 μοναδικά νησιά συνολικά.',
    'achievements.weatherSurvivor.title': 'Βετεράνος του Μελτεμιού',
    'achievements.weatherSurvivor.desc': 'Επιβιώστε από θύελλα μελτεμιού χωρίς να χάσετε ζωή.',
    // Analytics & Backup
    'analytics.title': 'ΠΙΝΑΚΑΣ ΑΝΑΛΥΤΙΚΩΝ ΠΡΟΓΡΑΜΜΑΤΙΣΤΗ',
    'analytics.saveRate': 'Ποσοστό Απόκρουσης',
    'backup.export': 'Εξαγωγή Αντιγράφου',
    'backup.import': 'Επαναφορά Αντιγράφου',
    // Weather
    'weather.meltemi': 'Άνεμος Μελτέμι: Ισχυρός Νότιος Άνεμος',
    'weather.crosswind': 'Πλάγιος Άνεμος: Πλευρικό Αιγαιοπελαγίτικο Αεράκι',
    'weather.calm': 'Ήρεμη Θάλασσα: Γαλήνια Νερά & Χαμηλή Βαρύτητα',
    // Difficulty
    'difficulty.easy': 'Εύκολο',
    'difficulty.normal': 'Κανονικό',
    'difficulty.hard': 'Δύσκολο',
  },
};

export class I18nManager {
  private currentLocale: SupportedLocale = 'en';

  constructor(initialLocale: SupportedLocale = 'en') {
    this.currentLocale = initialLocale;
  }

  public getLocale(): SupportedLocale {
    return this.currentLocale;
  }

  public setLocale(locale: SupportedLocale): void {
    this.currentLocale = locale;
  }

  public t(key: TranslationKey): string {
    const localeDict = TRANSLATIONS[this.currentLocale];
    if (localeDict && localeDict[key]) {
      return localeDict[key];
    }
    // Fallback to English
    return TRANSLATIONS.en[key] ?? key;
  }
}
