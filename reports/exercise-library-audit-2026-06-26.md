# Audit libreria esercizi

Data report: 2026-06-26

## Contesto strutturale

- Modello Prisma immagini esercizi: `Exercise.imageUrls Json?`.
- Non esistono oggi campi distinti `imageStart` e `imageEnd` nello schema.
- La UI tratta `imageUrls[0]` come prima immagine e `imageUrls[1]` come seconda immagine.
- Esercizi analizzati: 1010.

## Riepilogo quantitativo

- Completi: 940
- Incompleti: 70
- Manca start: 0
- Manca end: 0
- Manca entrambe: 70
- Probabili duplicati/sinonimi: 46
- Esercizi interni: 161
- Esercizi importati: 849
- Esercizi con oltre 2 immagini: 0

## Proposta normalizzazione alias/sinonimi

| Canonico proposto | Motivo match | Esercizi coinvolti |
| --- | --- | --- |
| 3/4 Sit-Up | canonical_tokens,same_primary,same_equipment,same_category | 162: 3/4 Sit-Up [3-4-sit-up]<br>828: Sit-Up [sit-up] |
| Arnold Dumbbell Press | canonical_tokens,same_primary,same_equipment,same_category | 73: Arnold press [arnold-press]<br>187: Arnold Dumbbell Press [arnold-dumbbell-press] |
| Barbell Curl | canonical_tokens,same_primary,same_equipment,same_category | 111: Curl bilanciere [curl-bilanciere]<br>205: Barbell Curl [barbell-curl] |
| Hammer curl | canonical_tokens,slug_similar,name_similar,same_primary,same_equipment,same_category | 112: Hammer curl [hammer-curl]<br>461: Hammer Curls [hammer-curls] |
| Machine Preacher Curls | canonical_tokens,same_primary,same_equipment,same_category | 116: Preacher curl macchina [preacher-curl-macchina]<br>606: Machine Preacher Curls [machine-preacher-curls] |
| Close grip bench press | canonical_tokens,same_primary,same_equipment,same_category | 123: Close grip bench press [close-grip-bench-press]<br>328: Close-Grip Barbell Bench Press [close-grip-barbell-bench-press] |
| Romanian Deadlift | canonical_tokens,same_primary,same_equipment,same_category | 91: Romanian deadlift bilanciere [romanian-deadlift-bilanciere]<br>749: Romanian Deadlift [romanian-deadlift] |
| Front Barbell Squat | canonical_tokens,same_primary,same_equipment,same_category | 80: Front squat [front-squat]<br>440: Front Barbell Squat [front-barbell-squat] |
| Barbell Hip Thrust | canonical_tokens,same_primary,same_equipment,same_category | 6: Hip thrust bilanciere [hip-thrust]<br>212: Barbell Hip Thrust [barbell-hip-thrust] |
| Barbell Squat | canonical_tokens,same_primary,same_equipment,same_category | 79: Squat bilanciere [squat-bilanciere]<br>224: Barbell Squat [barbell-squat] |
| Cable Rope Overhead Triceps Extension | canonical_tokens,same_primary,same_equipment,same_category | 121: Overhead cable extension [overhead-cable-extension]<br>284: Cable Rope Overhead Triceps Extension [cable-rope-overhead-triceps-extension] |
| Bench Dips | canonical_tokens,slug_similar,same_primary,same_equipment,same_category | 122: Dip panca [bench-dip]<br>231: Bench Dips [bench-dips] |
| Push-up | canonical_tokens,same_primary,same_equipment,same_category | 11: Push-up [push-up]<br>714: Pushups [pushups] |
| Leg curl seduto | canonical_tokens,same_primary,same_equipment,same_category | 93: Leg curl seduto [leg-curl-seduto]<br>786: Seated Leg Curl [seated-leg-curl] |
| Decline Smith Press | canonical_tokens,same_primary,same_equipment,same_category | 361: Decline Smith Press [decline-smith-press]<br>843: Smith Machine Decline Press [smith-machine-decline-press] |
| Leg extension | canonical_tokens,slug_similar,name_similar,same_primary,same_equipment,same_category | 82: Leg extension [leg-extension]<br>559: Leg Extensions [leg-extensions] |
| Croci manubri | canonical_tokens,same_primary,same_equipment,same_category | 44: Croci manubri [croci-manubri]<br>383: Dumbbell Flyes [dumbbell-flyes] |
| Calf press alla leg press | canonical_tokens,same_primary,same_equipment,same_category | 108: Calf press alla leg press [calf-press-leg-press]<br>294: Calf Press On The Leg Press Machine [calf-press-on-the-leg-press-machine] |
| Standing calf raise macchina | canonical_tokens,same_primary,same_equipment,same_category | 106: Standing calf raise macchina [standing-calf-raise-machine]<br>891: Standing Calf Raises [standing-calf-raises] |
| Chest press inclinata | canonical_tokens,same_primary,same_equipment,same_category | 43: Chest press inclinata [chest-press-inclinata]<br>566: Leverage Incline Chest Press [leverage-incline-chest-press] |
| Alzate laterali manubri | canonical_tokens,same_primary,same_equipment,same_category | 16: Alzate laterali manubri [alzate-laterali]<br>807: Side Lateral Raise [side-lateral-raise] |
| Dumbbell Shoulder Press | canonical_tokens,same_primary,same_equipment,same_category | 66: Shoulder press manubri [shoulder-press-manubri]<br>400: Dumbbell Shoulder Press [dumbbell-shoulder-press] |
| Chest press macchina | canonical_tokens,same_primary,same_equipment,same_category | 13: Chest press macchina [chest-press-macchina]<br>604: Machine Bench Press [machine-bench-press] |

## Report completo

| id | nome | nome inglese / alias / slug | imageStart presente | imageEnd presente | stato finale | possibile match con altro esercizio esistente | note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Squat corpo libero | squat-corpo-libero | sì | sì | completo |  | esercizio interno |
| 2 | Goblet squat | goblet-squat \| Goblet_Squat | sì | sì | completo |  | esercizio interno |
| 3 | Leg press | leg-press \| Leg_Press | sì | sì | completo |  | esercizio interno |
| 4 | Affondi statici | affondi | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 5 | Step-up | step-up | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 6 | Hip thrust bilanciere | hip-thrust \| barbell-hip-thrust | sì | sì | completo | 212: Barbell Hip Thrust [barbell-hip-thrust] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 7 | Glute bridge | glute-bridge | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 8 | Romanian deadlift manubri | romanian-deadlift-con-manubri | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 9 | Leg curl macchina | leg-curl-macchina | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 10 | Standing calf raise | calf-raise \| standing-calf-raises | sì | sì | completo |  | esercizio interno |
| 11 | Push-up | push-up | sì | sì | completo | 714: Pushups [pushups] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 12 | Panca piana bilanciere | bench-press | sì | sì | completo |  | esercizio interno |
| 13 | Chest press macchina | chest-press-macchina \| machine-bench-press | sì | sì | completo | 604: Machine Bench Press [machine-bench-press] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 14 | Panca inclinata manubri | incline-dumbbell-press \| Incline_Dumbbell_Press | sì | sì | completo |  | esercizio interno |
| 15 | Shoulder press macchina | shoulder-press-macchina | sì | sì | completo |  | esercizio interno |
| 16 | Alzate laterali manubri | alzate-laterali \| side-lateral-raise | sì | sì | completo | 807: Side Lateral Raise [side-lateral-raise] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 17 | Lat machine avanti | lat-machine-avanti | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 18 | Seated cable row | seated-cable-row \| seated-cable-rows | sì | sì | completo |  | esercizio interno |
| 19 | Rematore manubrio | rematore-con-manubrio | sì | sì | completo |  | esercizio interno |
| 20 | Trazioni assistite | assisted-pull-up \| band-assisted-pull-up | sì | sì | completo |  | esercizio interno |
| 21 | Face pull | face-pull \| Face_Pull | sì | sì | completo |  | esercizio interno |
| 22 | Curl manubri | curl-manubri | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 23 | Pushdown corda | triceps-pushdown \| Triceps_Pushdown | sì | sì | completo |  | esercizio interno |
| 24 | Plank | plank \| Plank | sì | sì | completo |  | esercizio interno |
| 25 | Side plank | side-plank | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 26 | Dead bug | dead-bug \| Dead_Bug | sì | sì | completo |  | esercizio interno |
| 27 | Crunch controllato | crunch-controllato | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 28 | Pallof press | pallof-press \| Pallof_Press | sì | sì | completo |  | esercizio interno |
| 29 | Farmer carry | farmer-walk \| farmers-walk | sì | sì | completo |  | esercizio interno |
| 30 | Camminata inclinata | camminata-inclinata | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 31 | Bike cyclette | bike-cyclette | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 32 | Ellittica | ellittica | sì | sì | completo |  | esercizio interno |
| 33 | Jumping jack | jumping-jack | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 34 | Mobilità anche | mobility-anche | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 35 | Mobilità spalle | mobility-spalle | sì | sì | completo |  | esercizio interno |
| 36 | Bird dog | bird-dog | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 37 | Wall sit | wall-sit | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 38 | Pulldown a braccia tese | pulldown-a-braccia-tese | sì | sì | completo |  | esercizio interno |
| 39 | Split squat | split-squat-statico | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 40 | Mountain climber lento | mountain-climber-lento | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 41 | Panca inclinata bilanciere | panca-inclinata-bilanciere | sì | sì | completo |  | esercizio interno |
| 42 | Panca piana manubri | panca-piana-manubri \| dumbbell-bench-press | sì | sì | completo |  | esercizio interno |
| 43 | Chest press inclinata | chest-press-inclinata \| leverage-incline-chest-press | sì | sì | completo | 566: Leverage Incline Chest Press [leverage-incline-chest-press] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 44 | Croci manubri | croci-manubri | sì | sì | completo | 383: Dumbbell Flyes [dumbbell-flyes] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 45 | Croci ai cavi | croci-ai-cavi | sì | sì | completo |  | esercizio interno |
| 46 | Pec deck | pec-deck | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 47 | Push-up inclinati | push-up-inclinati | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 48 | Dip alle parallele | dip-alle-parallele | sì | sì | completo |  | esercizio interno |
| 49 | Pullover manubrio | pullover-manubrio | sì | sì | completo |  | esercizio interno |
| 50 | Pullover macchina | pullover-macchina | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 51 | Floor press manubri | floor-press-manubri \| dumbbell-floor-press | sì | sì | completo |  | esercizio interno |
| 52 | Trazioni presa prona | pull-up-prona | sì | sì | completo |  | esercizio interno |
| 53 | Trazioni presa supina | chin-up \| Chin-Up | sì | sì | completo |  | esercizio interno |
| 54 | Rematore bilanciere | rematore-bilanciere | sì | sì | completo |  | esercizio interno |
| 55 | Rematore macchina | rematore-macchina | sì | sì | completo |  | esercizio interno |
| 56 | Pulley basso | pulley-basso \| seated-cable-rows | sì | sì | completo |  | esercizio interno |
| 57 | Chest supported row | chest-supported-row | sì | sì | completo |  | esercizio interno |
| 58 | Reverse fly machine | reverse-fly-machine | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 59 | Hyperextension | back-extension | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 60 | Lat pulldown presa neutra | neutral-grip-lat-pulldown | sì | sì | completo |  | esercizio interno |
| 61 | Lat pulldown unilaterale | single-arm-lat-pulldown \| one-arm-lat-pulldown | sì | sì | completo |  | esercizio interno |
| 62 | T-bar row supportato | t-bar-row-supportato | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 63 | Inverted row | inverted-row \| Inverted_Row | sì | sì | completo |  | esercizio interno |
| 64 | Pullover macchina dorsali | pullover-machine-back | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 65 | Dead hang | dead-hang | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 66 | Shoulder press manubri | shoulder-press-manubri | sì | sì | completo | 400: Dumbbell Shoulder Press [dumbbell-shoulder-press] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 67 | Military press | military-press | sì | sì | completo |  | esercizio interno |
| 68 | Alzate laterali ai cavi | alzate-laterali-ai-cavi | sì | sì | completo |  | esercizio interno |
| 69 | Alzate laterali macchina | alzate-laterali-macchina | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 70 | Alzate frontali | alzate-frontali | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 71 | Reverse fly manubri | reverse-fly-manubri | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 72 | Rear delt fly ai cavi | rear-delt-cable-fly | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 73 | Arnold press | arnold-press \| arnold-dumbbell-press | sì | sì | completo | 187: Arnold Dumbbell Press [arnold-dumbbell-press] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 74 | Tirate al mento | upright-row | sì | sì | completo |  | esercizio interno |
| 75 | Extrarotazioni al cavo | extrarotazioni-cavo | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 76 | Extrarotazioni con elastico | extrarotazioni-elastico | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 77 | Landmine press | landmine-press | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 78 | Scapular pull-up | scapular-pull-up \| Scapular_Pull-Up | sì | sì | completo |  | esercizio interno |
| 79 | Squat bilanciere | squat-bilanciere | sì | sì | completo | 224: Barbell Squat [barbell-squat] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 80 | Front squat | front-squat | sì | sì | completo | 440: Front Barbell Squat [front-barbell-squat] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 81 | Hack squat | hack-squat \| Hack_Squat | sì | sì | completo |  | esercizio interno |
| 82 | Leg extension | leg-extension | sì | sì | completo | 559: Leg Extensions [leg-extensions] (canonical_tokens,slug_similar,name_similar,same_primary,same_equipment,same_category) | esercizio interno |
| 83 | Affondi camminati | affondi-camminati | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 84 | Bulgarian split squat | bulgarian-split-squat | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 85 | Smith machine squat | smith-machine-squat \| Smith_Machine_Squat | sì | sì | completo |  | esercizio interno |
| 86 | Goblet squat talloni rialzati | heels-elevated-goblet-squat | sì | sì | completo |  | esercizio interno |
| 87 | Box squat | box-squat \| Box_Squat | sì | sì | completo |  | esercizio interno |
| 88 | Spanish squat | spanish-squat | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 89 | Reverse lunge | reverse-lunge | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 90 | Sissy squat assistito | sissy-squat-assistito | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 91 | Romanian deadlift bilanciere | romanian-deadlift-bilanciere | sì | sì | completo | 749: Romanian Deadlift [romanian-deadlift] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 92 | Leg curl sdraiato | leg-curl-sdraiato \| lying-leg-curls | sì | sì | completo |  | esercizio interno |
| 93 | Leg curl seduto | leg-curl-seduto | sì | sì | completo | 786: Seated Leg Curl [seated-leg-curl] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 94 | Leg curl fitball | leg-curl-fitball | sì | sì | completo |  | esercizio interno |
| 95 | Pull-through al cavo | pull-through-cavo \| pull-through | sì | sì | completo |  | esercizio interno |
| 96 | Good morning | good-morning \| Good_Morning | sì | sì | completo |  | esercizio interno |
| 97 | Back extension glute focus | back-extension-glute-focus | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 98 | Abductor machine | abductor-machine | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 99 | Cable kickback | cable-kickback | sì | sì | completo |  | esercizio interno |
| 100 | Single leg Romanian deadlift | single-leg-romanian-deadlift | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 101 | Hip thrust macchina | hip-thrust-machine | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 102 | Frog pump | frog-pump | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 103 | Nordic curl assistito | nordic-curl-assistito | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 104 | Single leg glute bridge | single-leg-glute-bridge \| Single_Leg_Glute_Bridge | sì | sì | completo |  | esercizio interno |
| 105 | Adductor machine | adductor-machine | sì | sì | completo |  | esercizio interno |
| 106 | Standing calf raise macchina | standing-calf-raise-machine | no | no | manca entrambe | 891: Standing Calf Raises [standing-calf-raises] (canonical_tokens,same_primary,same_equipment,same_category) | nessuna immagine in imageUrls; esercizio interno |
| 107 | Seated calf raise | seated-calf-raise \| Seated_Calf_Raise | sì | sì | completo |  | esercizio interno |
| 108 | Calf press alla leg press | calf-press-leg-press | sì | sì | completo | 294: Calf Press On The Leg Press Machine [calf-press-on-the-leg-press-machine] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 109 | Donkey calf raise | donkey-calf-raise \| donkey-calf-raises | sì | sì | completo |  | esercizio interno |
| 110 | Single leg calf raise | single-leg-calf-raise | sì | sì | completo |  | esercizio interno |
| 111 | Curl bilanciere | curl-bilanciere | sì | sì | completo | 205: Barbell Curl [barbell-curl] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 112 | Hammer curl | hammer-curl \| hammer-curls | sì | sì | completo | 461: Hammer Curls [hammer-curls] (canonical_tokens,slug_similar,name_similar,same_primary,same_equipment,same_category) | esercizio interno |
| 113 | Curl cavo | curl-cavo | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 114 | Curl panca Scott | curl-panca-scott | sì | sì | completo |  | esercizio interno |
| 115 | Curl inclinato | curl-inclinato \| incline-dumbbell-curl | sì | sì | completo |  | esercizio interno |
| 116 | Preacher curl macchina | preacher-curl-macchina | sì | sì | completo | 606: Machine Preacher Curls [machine-preacher-curls] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 117 | Reverse curl | reverse-curl | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 118 | Pushdown barra | pushdown-barra | sì | sì | completo |  | esercizio interno |
| 119 | French press | french-press | sì | sì | completo |  | esercizio interno |
| 120 | Skull crusher | skull-crusher | sì | sì | completo |  | esercizio interno |
| 121 | Overhead cable extension | overhead-cable-extension \| cable-rope-overhead-triceps-extension | sì | sì | completo | 284: Cable Rope Overhead Triceps Extension [cable-rope-overhead-triceps-extension] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 122 | Dip panca | bench-dip | sì | sì | completo | 231: Bench Dips [bench-dips] (canonical_tokens,slug_similar,same_primary,same_equipment,same_category) | esercizio interno |
| 123 | Close grip bench press | close-grip-bench-press | sì | sì | completo | 328: Close-Grip Barbell Bench Press [close-grip-barbell-bench-press] (canonical_tokens,same_primary,same_equipment,same_category) | esercizio interno |
| 124 | Triceps machine | triceps-machine | sì | sì | completo |  | esercizio interno |
| 125 | Pushdown unilaterale al cavo | single-arm-cable-pushdown | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 126 | Crunch | crunch | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 127 | Crunch machine | crunch-machine | sì | sì | completo |  | esercizio interno |
| 128 | Cable crunch | cable-crunch \| Cable_Crunch | sì | sì | completo |  | esercizio interno |
| 129 | Hanging knee raise | hanging-knee-raise | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 130 | Reverse crunch | reverse-crunch \| Reverse_Crunch | sì | sì | completo |  | esercizio interno |
| 131 | Russian twist | russian-twist \| Russian_Twist | sì | sì | completo |  | esercizio interno |
| 132 | Ab wheel | ab-wheel | sì | sì | completo |  | esercizio interno |
| 133 | Hollow hold | hollow-hold | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 134 | Suitcase carry | suitcase-carry | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 135 | Plank con shoulder tap | plank-shoulder-tap | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 136 | Bear crawl | bear-crawl | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 137 | Camminata treadmill | camminata-treadmill | sì | sì | completo |  | esercizio interno |
| 138 | Vogatore | vogatore | sì | sì | completo |  | esercizio interno |
| 139 | Stair climber | stair-climber | sì | sì | completo |  | esercizio interno |
| 140 | Salto corda | jump-rope | sì | sì | completo |  | esercizio interno |
| 141 | Sled push | sled-push \| Sled_Push | sì | sì | completo |  | esercizio interno |
| 142 | Battle rope | battle-rope | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 143 | Assault bike | assault-bike | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 144 | Marching jack | marching-jack | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 145 | Camminata veloce outdoor | camminata-veloce-outdoor | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 146 | Mobilità caviglie | mobility-caviglie | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 147 | Cat cow | cat-cow | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 148 | Thoracic rotation | thoracic-rotation | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 149 | Band pull-apart | band-pull-apart \| Band_Pull_Apart | sì | sì | completo |  | esercizio interno |
| 150 | Scapular push-up | scapular-push-up | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 151 | Wall slides | wall-slides | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 152 | Hip flexor stretch | hip-flexor-stretch | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 153 | Hamstring stretch | hamstring-stretch \| Hamstring_Stretch | sì | sì | completo |  | esercizio interno |
| 154 | Couch stretch | couch-stretch | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 155 | Squat hold mobility | squat-hold-mobility | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 156 | 90/90 hip switch | 90-90-hip-switch | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 157 | Ankle rocker | ankle-rocker | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 158 | World's greatest stretch | worlds-greatest-stretch \| Worlds_Greatest_Stretch | sì | sì | completo |  | esercizio interno |
| 159 | Clamshell | clamshell | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 160 | Quad stretch in piedi | quad-stretch-standing | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 161 | Cossack squat bodyweight | cossack-squat-bodyweight | no | no | manca entrambe |  | nessuna immagine in imageUrls; esercizio interno |
| 162 | 3/4 Sit-Up | 3-4-sit-up \| 3_4_Sit-Up | sì | sì | completo | 828: Sit-Up [sit-up] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 163 | 90/90 Hamstring | 90-90-hamstring \| 90_90_Hamstring | sì | sì | completo |  | fonte=free_exercise_db |
| 164 | Ab Crunch Machine | ab-crunch-machine \| Ab_Crunch_Machine | sì | sì | completo |  | fonte=free_exercise_db |
| 165 | Ab Roller | ab-roller \| Ab_Roller | sì | sì | completo |  | fonte=free_exercise_db |
| 166 | Adductor | adductor \| Adductor | sì | sì | completo |  | fonte=free_exercise_db |
| 167 | Adductor/Groin | adductor-groin \| Adductor_Groin | sì | sì | completo |  | fonte=free_exercise_db |
| 168 | Advanced Kettlebell Windmill | advanced-kettlebell-windmill \| Advanced_Kettlebell_Windmill | sì | sì | completo |  | fonte=free_exercise_db |
| 169 | Air Bike | air-bike \| Air_Bike | sì | sì | completo |  | fonte=free_exercise_db |
| 170 | All Fours Quad Stretch | all-fours-quad-stretch \| All_Fours_Quad_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 171 | Alternate Hammer Curl | alternate-hammer-curl \| Alternate_Hammer_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 172 | Alternate Heel Touchers | alternate-heel-touchers \| Alternate_Heel_Touchers | sì | sì | completo |  | fonte=free_exercise_db |
| 173 | Alternate Incline Dumbbell Curl | alternate-incline-dumbbell-curl \| Alternate_Incline_Dumbbell_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 174 | Alternate Leg Diagonal Bound | alternate-leg-diagonal-bound \| Alternate_Leg_Diagonal_Bound | sì | sì | completo |  | fonte=free_exercise_db |
| 175 | Alternating Cable Shoulder Press | alternating-cable-shoulder-press \| Alternating_Cable_Shoulder_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 176 | Alternating Deltoid Raise | alternating-deltoid-raise \| Alternating_Deltoid_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 177 | Alternating Floor Press | alternating-floor-press \| Alternating_Floor_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 178 | Alternating Hang Clean | alternating-hang-clean \| Alternating_Hang_Clean | sì | sì | completo |  | fonte=free_exercise_db |
| 179 | Alternating Kettlebell Press | alternating-kettlebell-press \| Alternating_Kettlebell_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 180 | Alternating Kettlebell Row | alternating-kettlebell-row \| Alternating_Kettlebell_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 181 | Alternating Renegade Row | alternating-renegade-row \| Alternating_Renegade_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 182 | Ankle Circles | ankle-circles \| Ankle_Circles | sì | sì | completo |  | fonte=free_exercise_db |
| 183 | Ankle On The Knee | ankle-on-the-knee \| Ankle_On_The_Knee | sì | sì | completo |  | fonte=free_exercise_db |
| 184 | Anterior Tibialis-SMR | anterior-tibialis-smr \| Anterior_Tibialis-SMR | sì | sì | completo |  | fonte=free_exercise_db |
| 185 | Anti-Gravity Press | anti-gravity-press \| Anti-Gravity_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 186 | Arm Circles | arm-circles \| Arm_Circles | sì | sì | completo |  | fonte=free_exercise_db |
| 187 | Arnold Dumbbell Press | arnold-dumbbell-press \| Arnold_Dumbbell_Press | sì | sì | completo | 73: Arnold press [arnold-press] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 188 | Around The Worlds | around-the-worlds \| Around_The_Worlds | sì | sì | completo |  | fonte=free_exercise_db |
| 189 | Atlas Stone Trainer | atlas-stone-trainer \| Atlas_Stone_Trainer | sì | sì | completo |  | fonte=free_exercise_db |
| 190 | Atlas Stones | atlas-stones \| Atlas_Stones | sì | sì | completo |  | fonte=free_exercise_db |
| 191 | Axle Deadlift | axle-deadlift \| Axle_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 192 | Back Flyes - With Bands | back-flyes-with-bands \| Back_Flyes_-_With_Bands | sì | sì | completo |  | fonte=free_exercise_db |
| 193 | Backward Drag | backward-drag \| Backward_Drag | sì | sì | completo |  | fonte=free_exercise_db |
| 194 | Backward Medicine Ball Throw | backward-medicine-ball-throw \| Backward_Medicine_Ball_Throw | sì | sì | completo |  | fonte=free_exercise_db |
| 195 | Balance Board | balance-board \| Balance_Board | sì | sì | completo |  | fonte=free_exercise_db |
| 196 | Ball Leg Curl | ball-leg-curl \| Ball_Leg_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 197 | Band Assisted Pull-Up | band-assisted-pull-up \| Band_Assisted_Pull-Up | sì | sì | completo |  | fonte=free_exercise_db |
| 198 | Band Good Morning | band-good-morning \| Band_Good_Morning | sì | sì | completo |  | fonte=free_exercise_db |
| 199 | Band Good Morning (Pull Through) | band-good-morning-pull-through \| Band_Good_Morning_Pull_Through | sì | sì | completo |  | fonte=free_exercise_db |
| 200 | Band Hip Adductions | band-hip-adductions \| Band_Hip_Adductions | sì | sì | completo |  | fonte=free_exercise_db |
| 201 | Band Skull Crusher | band-skull-crusher \| Band_Skull_Crusher | sì | sì | completo |  | fonte=free_exercise_db |
| 202 | Barbell Ab Rollout | barbell-ab-rollout \| Barbell_Ab_Rollout | sì | sì | completo |  | fonte=free_exercise_db |
| 203 | Barbell Ab Rollout - On Knees | barbell-ab-rollout-on-knees \| Barbell_Ab_Rollout_-_On_Knees | sì | sì | completo |  | fonte=free_exercise_db |
| 204 | Barbell Bench Press - Medium Grip | barbell-bench-press-medium-grip \| Barbell_Bench_Press_-_Medium_Grip | sì | sì | completo |  | fonte=free_exercise_db |
| 205 | Barbell Curl | barbell-curl \| Barbell_Curl | sì | sì | completo | 111: Curl bilanciere [curl-bilanciere] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 206 | Barbell Curls Lying Against An Incline | barbell-curls-lying-against-an-incline \| Barbell_Curls_Lying_Against_An_Incline | sì | sì | completo |  | fonte=free_exercise_db |
| 207 | Barbell Deadlift | barbell-deadlift \| Barbell_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 208 | Barbell Full Squat | barbell-full-squat \| Barbell_Full_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 209 | Barbell Glute Bridge | barbell-glute-bridge \| Barbell_Glute_Bridge | sì | sì | completo |  | fonte=free_exercise_db |
| 210 | Barbell Guillotine Bench Press | barbell-guillotine-bench-press \| Barbell_Guillotine_Bench_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 211 | Barbell Hack Squat | barbell-hack-squat \| Barbell_Hack_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 212 | Barbell Hip Thrust | barbell-hip-thrust \| Barbell_Hip_Thrust | sì | sì | completo | 6: Hip thrust bilanciere [hip-thrust] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 213 | Barbell Incline Bench Press - Medium Grip | barbell-incline-bench-press-medium-grip \| Barbell_Incline_Bench_Press_-_Medium_Grip | sì | sì | completo |  | fonte=free_exercise_db |
| 214 | Barbell Incline Shoulder Raise | barbell-incline-shoulder-raise \| Barbell_Incline_Shoulder_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 215 | Barbell Lunge | barbell-lunge \| Barbell_Lunge | sì | sì | completo |  | fonte=free_exercise_db |
| 216 | Barbell Rear Delt Row | barbell-rear-delt-row \| Barbell_Rear_Delt_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 217 | Barbell Rollout from Bench | barbell-rollout-from-bench \| Barbell_Rollout_from_Bench | sì | sì | completo |  | fonte=free_exercise_db |
| 218 | Barbell Seated Calf Raise | barbell-seated-calf-raise \| Barbell_Seated_Calf_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 219 | Barbell Shoulder Press | barbell-shoulder-press \| Barbell_Shoulder_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 220 | Barbell Shrug | barbell-shrug \| Barbell_Shrug | sì | sì | completo |  | fonte=free_exercise_db |
| 221 | Barbell Shrug Behind The Back | barbell-shrug-behind-the-back \| Barbell_Shrug_Behind_The_Back | sì | sì | completo |  | fonte=free_exercise_db |
| 222 | Barbell Side Bend | barbell-side-bend \| Barbell_Side_Bend | sì | sì | completo |  | fonte=free_exercise_db |
| 223 | Barbell Side Split Squat | barbell-side-split-squat \| Barbell_Side_Split_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 224 | Barbell Squat | barbell-squat \| Barbell_Squat | sì | sì | completo | 79: Squat bilanciere [squat-bilanciere] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 225 | Barbell Squat To A Bench | barbell-squat-to-a-bench \| Barbell_Squat_To_A_Bench | sì | sì | completo |  | fonte=free_exercise_db |
| 226 | Barbell Step Ups | barbell-step-ups \| Barbell_Step_Ups | sì | sì | completo |  | fonte=free_exercise_db |
| 227 | Barbell Walking Lunge | barbell-walking-lunge \| Barbell_Walking_Lunge | sì | sì | completo |  | fonte=free_exercise_db |
| 228 | Battling Ropes | battling-ropes \| Battling_Ropes | sì | sì | completo |  | fonte=free_exercise_db |
| 229 | Bear Crawl Sled Drags | bear-crawl-sled-drags \| Bear_Crawl_Sled_Drags | sì | sì | completo |  | fonte=free_exercise_db |
| 230 | Behind Head Chest Stretch | behind-head-chest-stretch \| Behind_Head_Chest_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 231 | Bench Dips | bench-dips \| Bench_Dips | sì | sì | completo | 122: Dip panca [bench-dip] (canonical_tokens,slug_similar,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 232 | Bench Jump | bench-jump \| Bench_Jump | sì | sì | completo |  | fonte=free_exercise_db |
| 233 | Bench Press - Powerlifting | bench-press-powerlifting \| Bench_Press_-_Powerlifting | sì | sì | completo |  | fonte=free_exercise_db |
| 234 | Bench Press - With Bands | bench-press-with-bands \| Bench_Press_-_With_Bands | sì | sì | completo |  | fonte=free_exercise_db |
| 235 | Bench Press with Chains | bench-press-with-chains \| Bench_Press_with_Chains | sì | sì | completo |  | fonte=free_exercise_db |
| 236 | Bench Sprint | bench-sprint \| Bench_Sprint | sì | sì | completo |  | fonte=free_exercise_db |
| 237 | Bent-Arm Barbell Pullover | bent-arm-barbell-pullover \| Bent-Arm_Barbell_Pullover | sì | sì | completo |  | fonte=free_exercise_db |
| 238 | Bent-Arm Dumbbell Pullover | bent-arm-dumbbell-pullover \| Bent-Arm_Dumbbell_Pullover | sì | sì | completo |  | fonte=free_exercise_db |
| 239 | Bent-Knee Hip Raise | bent-knee-hip-raise \| Bent-Knee_Hip_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 240 | Bent Over Barbell Row | bent-over-barbell-row \| Bent_Over_Barbell_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 241 | Bent Over Dumbbell Rear Delt Raise With Head On Bench | bent-over-dumbbell-rear-delt-raise-with-head-on-bench \| Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench | sì | sì | completo |  | fonte=free_exercise_db |
| 242 | Bent Over Low-Pulley Side Lateral | bent-over-low-pulley-side-lateral \| Bent_Over_Low-Pulley_Side_Lateral | sì | sì | completo |  | fonte=free_exercise_db |
| 243 | Bent Over One-Arm Long Bar Row | bent-over-one-arm-long-bar-row \| Bent_Over_One-Arm_Long_Bar_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 244 | Bent Over Two-Arm Long Bar Row | bent-over-two-arm-long-bar-row \| Bent_Over_Two-Arm_Long_Bar_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 245 | Bent Over Two-Dumbbell Row | bent-over-two-dumbbell-row \| Bent_Over_Two-Dumbbell_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 246 | Bent Over Two-Dumbbell Row With Palms In | bent-over-two-dumbbell-row-with-palms-in \| Bent_Over_Two-Dumbbell_Row_With_Palms_In | sì | sì | completo |  | fonte=free_exercise_db |
| 247 | Bent Press | bent-press \| Bent_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 248 | Bicycling | bicycling \| Bicycling | sì | sì | completo |  | fonte=free_exercise_db |
| 249 | Bicycling, Stationary | bicycling-stationary \| Bicycling_Stationary | sì | sì | completo |  | fonte=free_exercise_db |
| 250 | Board Press | board-press \| Board_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 251 | Body-Up | body-up \| Body-Up | sì | sì | completo |  | fonte=free_exercise_db |
| 252 | Body Tricep Press | body-tricep-press \| Body_Tricep_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 253 | Bodyweight Flyes | bodyweight-flyes \| Bodyweight_Flyes | sì | sì | completo |  | fonte=free_exercise_db |
| 254 | Bodyweight Mid Row | bodyweight-mid-row \| Bodyweight_Mid_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 255 | Bodyweight Squat | bodyweight-squat \| Bodyweight_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 256 | Bodyweight Walking Lunge | bodyweight-walking-lunge \| Bodyweight_Walking_Lunge | sì | sì | completo |  | fonte=free_exercise_db |
| 257 | Bosu Ball Cable Crunch With Side Bends | bosu-ball-cable-crunch-with-side-bends \| Bosu_Ball_Cable_Crunch_With_Side_Bends | sì | sì | completo |  | fonte=free_exercise_db |
| 258 | Bottoms-Up Clean From The Hang Position | bottoms-up-clean-from-the-hang-position \| Bottoms-Up_Clean_From_The_Hang_Position | sì | sì | completo |  | fonte=free_exercise_db |
| 259 | Bottoms Up | bottoms-up \| Bottoms_Up | sì | sì | completo |  | fonte=free_exercise_db |
| 260 | Box Jump (Multiple Response) | box-jump-multiple-response \| Box_Jump_Multiple_Response | sì | sì | completo |  | fonte=free_exercise_db |
| 261 | Box Skip | box-skip \| Box_Skip | sì | sì | completo |  | fonte=free_exercise_db |
| 262 | Box Squat with Bands | box-squat-with-bands \| Box_Squat_with_Bands | sì | sì | completo |  | fonte=free_exercise_db |
| 263 | Box Squat with Chains | box-squat-with-chains \| Box_Squat_with_Chains | sì | sì | completo |  | fonte=free_exercise_db |
| 264 | Brachialis-SMR | brachialis-smr \| Brachialis-SMR | sì | sì | completo |  | fonte=free_exercise_db |
| 265 | Bradford/Rocky Presses | bradford-rocky-presses \| Bradford_Rocky_Presses | sì | sì | completo |  | fonte=free_exercise_db |
| 266 | Butt-Ups | butt-ups \| Butt-Ups | sì | sì | completo |  | fonte=free_exercise_db |
| 267 | Butt Lift (Bridge) | butt-lift-bridge \| Butt_Lift_Bridge | sì | sì | completo |  | fonte=free_exercise_db |
| 268 | Butterfly | butterfly \| Butterfly | sì | sì | completo |  | fonte=free_exercise_db |
| 269 | Cable Chest Press | cable-chest-press \| Cable_Chest_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 270 | Cable Crossover | cable-crossover \| Cable_Crossover | sì | sì | completo |  | fonte=free_exercise_db |
| 271 | Cable Deadlifts | cable-deadlifts \| Cable_Deadlifts | sì | sì | completo |  | fonte=free_exercise_db |
| 272 | Cable Hammer Curls - Rope Attachment | cable-hammer-curls-rope-attachment \| Cable_Hammer_Curls_-_Rope_Attachment | sì | sì | completo |  | fonte=free_exercise_db |
| 273 | Cable Hip Adduction | cable-hip-adduction \| Cable_Hip_Adduction | sì | sì | completo |  | fonte=free_exercise_db |
| 274 | Cable Incline Pushdown | cable-incline-pushdown \| Cable_Incline_Pushdown | sì | sì | completo |  | fonte=free_exercise_db |
| 275 | Cable Incline Triceps Extension | cable-incline-triceps-extension \| Cable_Incline_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 276 | Cable Internal Rotation | cable-internal-rotation \| Cable_Internal_Rotation | sì | sì | completo |  | fonte=free_exercise_db |
| 277 | Cable Iron Cross | cable-iron-cross \| Cable_Iron_Cross | sì | sì | completo |  | fonte=free_exercise_db |
| 278 | Cable Judo Flip | cable-judo-flip \| Cable_Judo_Flip | sì | sì | completo |  | fonte=free_exercise_db |
| 279 | Cable Lying Triceps Extension | cable-lying-triceps-extension \| Cable_Lying_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 280 | Cable One Arm Tricep Extension | cable-one-arm-tricep-extension \| Cable_One_Arm_Tricep_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 281 | Cable Preacher Curl | cable-preacher-curl \| Cable_Preacher_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 282 | Cable Rear Delt Fly | cable-rear-delt-fly \| Cable_Rear_Delt_Fly | sì | sì | completo |  | fonte=free_exercise_db |
| 283 | Cable Reverse Crunch | cable-reverse-crunch \| Cable_Reverse_Crunch | sì | sì | completo |  | fonte=free_exercise_db |
| 284 | Cable Rope Overhead Triceps Extension | cable-rope-overhead-triceps-extension \| Cable_Rope_Overhead_Triceps_Extension | sì | sì | completo | 121: Overhead cable extension [overhead-cable-extension] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 285 | Cable Rope Rear-Delt Rows | cable-rope-rear-delt-rows \| Cable_Rope_Rear-Delt_Rows | sì | sì | completo |  | fonte=free_exercise_db |
| 286 | Cable Russian Twists | cable-russian-twists \| Cable_Russian_Twists | sì | sì | completo |  | fonte=free_exercise_db |
| 287 | Cable Seated Crunch | cable-seated-crunch \| Cable_Seated_Crunch | sì | sì | completo |  | fonte=free_exercise_db |
| 288 | Cable Seated Lateral Raise | cable-seated-lateral-raise \| Cable_Seated_Lateral_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 289 | Cable Shoulder Press | cable-shoulder-press \| Cable_Shoulder_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 290 | Cable Shrugs | cable-shrugs \| Cable_Shrugs | sì | sì | completo |  | fonte=free_exercise_db |
| 291 | Cable Wrist Curl | cable-wrist-curl \| Cable_Wrist_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 292 | Calf-Machine Shoulder Shrug | calf-machine-shoulder-shrug \| Calf-Machine_Shoulder_Shrug | sì | sì | completo |  | fonte=free_exercise_db |
| 293 | Calf Press | calf-press \| Calf_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 294 | Calf Press On The Leg Press Machine | calf-press-on-the-leg-press-machine \| Calf_Press_On_The_Leg_Press_Machine | sì | sì | completo | 108: Calf press alla leg press [calf-press-leg-press] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 295 | Calf Raise On A Dumbbell | calf-raise-on-a-dumbbell \| Calf_Raise_On_A_Dumbbell | sì | sì | completo |  | fonte=free_exercise_db |
| 296 | Calf Raises - With Bands | calf-raises-with-bands \| Calf_Raises_-_With_Bands | sì | sì | completo |  | fonte=free_exercise_db |
| 297 | Calf Stretch Elbows Against Wall | calf-stretch-elbows-against-wall \| Calf_Stretch_Elbows_Against_Wall | sì | sì | completo |  | fonte=free_exercise_db |
| 298 | Calf Stretch Hands Against Wall | calf-stretch-hands-against-wall \| Calf_Stretch_Hands_Against_Wall | sì | sì | completo |  | fonte=free_exercise_db |
| 299 | Calves-SMR | calves-smr \| Calves-SMR | sì | sì | completo |  | fonte=free_exercise_db |
| 300 | Car Deadlift | car-deadlift \| Car_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 301 | Car Drivers | car-drivers \| Car_Drivers | sì | sì | completo |  | fonte=free_exercise_db |
| 302 | Carioca Quick Step | carioca-quick-step \| Carioca_Quick_Step | sì | sì | completo |  | fonte=free_exercise_db |
| 303 | Cat Stretch | cat-stretch \| Cat_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 304 | Catch and Overhead Throw | catch-and-overhead-throw \| Catch_and_Overhead_Throw | sì | sì | completo |  | fonte=free_exercise_db |
| 305 | Chain Handle Extension | chain-handle-extension \| Chain_Handle_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 306 | Chain Press | chain-press \| Chain_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 307 | Chair Leg Extended Stretch | chair-leg-extended-stretch \| Chair_Leg_Extended_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 308 | Chair Lower Back Stretch | chair-lower-back-stretch \| Chair_Lower_Back_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 309 | Chair Squat | chair-squat \| Chair_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 310 | Chair Upper Body Stretch | chair-upper-body-stretch \| Chair_Upper_Body_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 311 | Chest And Front Of Shoulder Stretch | chest-and-front-of-shoulder-stretch \| Chest_And_Front_Of_Shoulder_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 312 | Chest Push from 3 point stance | chest-push-from-3-point-stance \| Chest_Push_from_3_point_stance | sì | sì | completo |  | fonte=free_exercise_db |
| 313 | Chest Push (multiple response) | chest-push-multiple-response \| Chest_Push_multiple_response | sì | sì | completo |  | fonte=free_exercise_db |
| 314 | Chest Push (single response) | chest-push-single-response \| Chest_Push_single_response | sì | sì | completo |  | fonte=free_exercise_db |
| 315 | Chest Push with Run Release | chest-push-with-run-release \| Chest_Push_with_Run_Release | sì | sì | completo |  | fonte=free_exercise_db |
| 316 | Chest Stretch on Stability Ball | chest-stretch-on-stability-ball \| Chest_Stretch_on_Stability_Ball | sì | sì | completo |  | fonte=free_exercise_db |
| 317 | Child's Pose | childs-pose \| Childs_Pose | sì | sì | completo |  | fonte=free_exercise_db |
| 318 | Chin To Chest Stretch | chin-to-chest-stretch \| Chin_To_Chest_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 319 | Circus Bell | circus-bell \| Circus_Bell | sì | sì | completo |  | fonte=free_exercise_db |
| 320 | Clean | clean \| Clean | sì | sì | completo |  | fonte=free_exercise_db |
| 321 | Clean Deadlift | clean-deadlift \| Clean_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 322 | Clean Pull | clean-pull \| Clean_Pull | sì | sì | completo |  | fonte=free_exercise_db |
| 323 | Clean Shrug | clean-shrug \| Clean_Shrug | sì | sì | completo |  | fonte=free_exercise_db |
| 324 | Clean and Jerk | clean-and-jerk \| Clean_and_Jerk | sì | sì | completo |  | fonte=free_exercise_db |
| 325 | Clean and Press | clean-and-press \| Clean_and_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 326 | Clean from Blocks | clean-from-blocks \| Clean_from_Blocks | sì | sì | completo |  | fonte=free_exercise_db |
| 327 | Clock Push-Up | clock-push-up \| Clock_Push-Up | sì | sì | completo |  | fonte=free_exercise_db |
| 328 | Close-Grip Barbell Bench Press | close-grip-barbell-bench-press \| Close-Grip_Barbell_Bench_Press | sì | sì | completo | 123: Close grip bench press [close-grip-bench-press] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 329 | Close-Grip Dumbbell Press | close-grip-dumbbell-press \| Close-Grip_Dumbbell_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 330 | Close-Grip EZ-Bar Curl with Band | close-grip-ez-bar-curl-with-band \| Close-Grip_EZ-Bar_Curl_with_Band | sì | sì | completo |  | fonte=free_exercise_db |
| 331 | Close-Grip EZ-Bar Press | close-grip-ez-bar-press \| Close-Grip_EZ-Bar_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 332 | Close-Grip EZ Bar Curl | close-grip-ez-bar-curl \| Close-Grip_EZ_Bar_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 333 | Close-Grip Front Lat Pulldown | close-grip-front-lat-pulldown \| Close-Grip_Front_Lat_Pulldown | sì | sì | completo |  | fonte=free_exercise_db |
| 334 | Close-Grip Push-Up off of a Dumbbell | close-grip-push-up-off-of-a-dumbbell \| Close-Grip_Push-Up_off_of_a_Dumbbell | sì | sì | completo |  | fonte=free_exercise_db |
| 335 | Close-Grip Standing Barbell Curl | close-grip-standing-barbell-curl \| Close-Grip_Standing_Barbell_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 336 | Cocoons | cocoons \| Cocoons | sì | sì | completo |  | fonte=free_exercise_db |
| 337 | Conan's Wheel | conans-wheel \| Conans_Wheel | sì | sì | completo |  | fonte=free_exercise_db |
| 338 | Concentration Curls | concentration-curls \| Concentration_Curls | sì | sì | completo |  | fonte=free_exercise_db |
| 339 | Cross-Body Crunch | cross-body-crunch \| Cross-Body_Crunch | sì | sì | completo |  | fonte=free_exercise_db |
| 340 | Cross Body Hammer Curl | cross-body-hammer-curl \| Cross_Body_Hammer_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 341 | Cross Over - With Bands | cross-over-with-bands \| Cross_Over_-_With_Bands | sì | sì | completo |  | fonte=free_exercise_db |
| 342 | Crossover Reverse Lunge | crossover-reverse-lunge \| Crossover_Reverse_Lunge | sì | sì | completo |  | fonte=free_exercise_db |
| 343 | Crucifix | crucifix \| Crucifix | sì | sì | completo |  | fonte=free_exercise_db |
| 344 | Crunch - Hands Overhead | crunch-hands-overhead \| Crunch_-_Hands_Overhead | sì | sì | completo |  | fonte=free_exercise_db |
| 345 | Crunch - Legs On Exercise Ball | crunch-legs-on-exercise-ball \| Crunch_-_Legs_On_Exercise_Ball | sì | sì | completo |  | fonte=free_exercise_db |
| 346 | Crunches | crunches \| Crunches | sì | sì | completo |  | fonte=free_exercise_db |
| 347 | Cuban Press | cuban-press \| Cuban_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 348 | Dancer's Stretch | dancers-stretch \| Dancers_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 349 | Deadlift with Bands | deadlift-with-bands \| Deadlift_with_Bands | sì | sì | completo |  | fonte=free_exercise_db |
| 350 | Deadlift with Chains | deadlift-with-chains \| Deadlift_with_Chains | sì | sì | completo |  | fonte=free_exercise_db |
| 351 | Decline Barbell Bench Press | decline-barbell-bench-press \| Decline_Barbell_Bench_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 352 | Decline Close-Grip Bench To Skull Crusher | decline-close-grip-bench-to-skull-crusher \| Decline_Close-Grip_Bench_To_Skull_Crusher | sì | sì | completo |  | fonte=free_exercise_db |
| 353 | Decline Crunch | decline-crunch \| Decline_Crunch | sì | sì | completo |  | fonte=free_exercise_db |
| 354 | Decline Dumbbell Bench Press | decline-dumbbell-bench-press \| Decline_Dumbbell_Bench_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 355 | Decline Dumbbell Flyes | decline-dumbbell-flyes \| Decline_Dumbbell_Flyes | sì | sì | completo |  | fonte=free_exercise_db |
| 356 | Decline Dumbbell Triceps Extension | decline-dumbbell-triceps-extension \| Decline_Dumbbell_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 357 | Decline EZ Bar Triceps Extension | decline-ez-bar-triceps-extension \| Decline_EZ_Bar_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 358 | Decline Oblique Crunch | decline-oblique-crunch \| Decline_Oblique_Crunch | sì | sì | completo |  | fonte=free_exercise_db |
| 359 | Decline Push-Up | decline-push-up \| Decline_Push-Up | sì | sì | completo |  | fonte=free_exercise_db |
| 360 | Decline Reverse Crunch | decline-reverse-crunch \| Decline_Reverse_Crunch | sì | sì | completo |  | fonte=free_exercise_db |
| 361 | Decline Smith Press | decline-smith-press \| Decline_Smith_Press | sì | sì | completo | 843: Smith Machine Decline Press [smith-machine-decline-press] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 362 | Deficit Deadlift | deficit-deadlift \| Deficit_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 363 | Depth Jump Leap | depth-jump-leap \| Depth_Jump_Leap | sì | sì | completo |  | fonte=free_exercise_db |
| 364 | Dip Machine | dip-machine \| Dip_Machine | sì | sì | completo |  | fonte=free_exercise_db |
| 365 | Dips - Chest Version | dips-chest-version \| Dips_-_Chest_Version | sì | sì | completo |  | fonte=free_exercise_db |
| 366 | Dips - Triceps Version | dips-triceps-version \| Dips_-_Triceps_Version | sì | sì | completo |  | fonte=free_exercise_db |
| 367 | Donkey Calf Raises | donkey-calf-raises \| Donkey_Calf_Raises | sì | sì | completo |  | fonte=free_exercise_db |
| 368 | Double Kettlebell Alternating Hang Clean | double-kettlebell-alternating-hang-clean \| Double_Kettlebell_Alternating_Hang_Clean | sì | sì | completo |  | fonte=free_exercise_db |
| 369 | Double Kettlebell Jerk | double-kettlebell-jerk \| Double_Kettlebell_Jerk | sì | sì | completo |  | fonte=free_exercise_db |
| 370 | Double Kettlebell Push Press | double-kettlebell-push-press \| Double_Kettlebell_Push_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 371 | Double Kettlebell Snatch | double-kettlebell-snatch \| Double_Kettlebell_Snatch | sì | sì | completo |  | fonte=free_exercise_db |
| 372 | Double Kettlebell Windmill | double-kettlebell-windmill \| Double_Kettlebell_Windmill | sì | sì | completo |  | fonte=free_exercise_db |
| 373 | Double Leg Butt Kick | double-leg-butt-kick \| Double_Leg_Butt_Kick | sì | sì | completo |  | fonte=free_exercise_db |
| 374 | Downward Facing Balance | downward-facing-balance \| Downward_Facing_Balance | sì | sì | completo |  | fonte=free_exercise_db |
| 375 | Drag Curl | drag-curl \| Drag_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 376 | Drop Push | drop-push \| Drop_Push | sì | sì | completo |  | fonte=free_exercise_db |
| 377 | Dumbbell Alternate Bicep Curl | dumbbell-alternate-bicep-curl \| Dumbbell_Alternate_Bicep_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 378 | Dumbbell Bench Press | dumbbell-bench-press \| Dumbbell_Bench_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 379 | Dumbbell Bench Press with Neutral Grip | dumbbell-bench-press-with-neutral-grip \| Dumbbell_Bench_Press_with_Neutral_Grip | sì | sì | completo |  | fonte=free_exercise_db |
| 380 | Dumbbell Bicep Curl | dumbbell-bicep-curl \| Dumbbell_Bicep_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 381 | Dumbbell Clean | dumbbell-clean \| Dumbbell_Clean | sì | sì | completo |  | fonte=free_exercise_db |
| 382 | Dumbbell Floor Press | dumbbell-floor-press \| Dumbbell_Floor_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 383 | Dumbbell Flyes | dumbbell-flyes \| Dumbbell_Flyes | sì | sì | completo | 44: Croci manubri [croci-manubri] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 384 | Dumbbell Incline Row | dumbbell-incline-row \| Dumbbell_Incline_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 385 | Dumbbell Incline Shoulder Raise | dumbbell-incline-shoulder-raise \| Dumbbell_Incline_Shoulder_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 386 | Dumbbell Lunges | dumbbell-lunges \| Dumbbell_Lunges | sì | sì | completo |  | fonte=free_exercise_db |
| 387 | Dumbbell Lying One-Arm Rear Lateral Raise | dumbbell-lying-one-arm-rear-lateral-raise \| Dumbbell_Lying_One-Arm_Rear_Lateral_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 388 | Dumbbell Lying Pronation | dumbbell-lying-pronation \| Dumbbell_Lying_Pronation | sì | sì | completo |  | fonte=free_exercise_db |
| 389 | Dumbbell Lying Rear Lateral Raise | dumbbell-lying-rear-lateral-raise \| Dumbbell_Lying_Rear_Lateral_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 390 | Dumbbell Lying Supination | dumbbell-lying-supination \| Dumbbell_Lying_Supination | sì | sì | completo |  | fonte=free_exercise_db |
| 391 | Dumbbell One-Arm Shoulder Press | dumbbell-one-arm-shoulder-press \| Dumbbell_One-Arm_Shoulder_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 392 | Dumbbell One-Arm Triceps Extension | dumbbell-one-arm-triceps-extension \| Dumbbell_One-Arm_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 393 | Dumbbell One-Arm Upright Row | dumbbell-one-arm-upright-row \| Dumbbell_One-Arm_Upright_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 394 | Dumbbell Prone Incline Curl | dumbbell-prone-incline-curl \| Dumbbell_Prone_Incline_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 395 | Dumbbell Raise | dumbbell-raise \| Dumbbell_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 396 | Dumbbell Rear Lunge | dumbbell-rear-lunge \| Dumbbell_Rear_Lunge | sì | sì | completo |  | fonte=free_exercise_db |
| 397 | Dumbbell Scaption | dumbbell-scaption \| Dumbbell_Scaption | sì | sì | completo |  | fonte=free_exercise_db |
| 398 | Dumbbell Seated Box Jump | dumbbell-seated-box-jump \| Dumbbell_Seated_Box_Jump | sì | sì | completo |  | fonte=free_exercise_db |
| 399 | Dumbbell Seated One-Leg Calf Raise | dumbbell-seated-one-leg-calf-raise \| Dumbbell_Seated_One-Leg_Calf_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 400 | Dumbbell Shoulder Press | dumbbell-shoulder-press \| Dumbbell_Shoulder_Press | sì | sì | completo | 66: Shoulder press manubri [shoulder-press-manubri] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 401 | Dumbbell Shrug | dumbbell-shrug \| Dumbbell_Shrug | sì | sì | completo |  | fonte=free_exercise_db |
| 402 | Dumbbell Side Bend | dumbbell-side-bend \| Dumbbell_Side_Bend | sì | sì | completo |  | fonte=free_exercise_db |
| 403 | Dumbbell Squat | dumbbell-squat \| Dumbbell_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 404 | Dumbbell Squat To A Bench | dumbbell-squat-to-a-bench \| Dumbbell_Squat_To_A_Bench | sì | sì | completo |  | fonte=free_exercise_db |
| 405 | Dumbbell Step Ups | dumbbell-step-ups \| Dumbbell_Step_Ups | sì | sì | completo |  | fonte=free_exercise_db |
| 406 | Dumbbell Tricep Extension -Pronated Grip | dumbbell-tricep-extension-pronated-grip \| Dumbbell_Tricep_Extension_-Pronated_Grip | sì | sì | completo |  | fonte=free_exercise_db |
| 407 | Dynamic Back Stretch | dynamic-back-stretch \| Dynamic_Back_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 408 | Dynamic Chest Stretch | dynamic-chest-stretch \| Dynamic_Chest_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 409 | EZ-Bar Curl | ez-bar-curl \| EZ-Bar_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 410 | EZ-Bar Skullcrusher | ez-bar-skullcrusher \| EZ-Bar_Skullcrusher | sì | sì | completo |  | fonte=free_exercise_db |
| 411 | Elbow Circles | elbow-circles \| Elbow_Circles | sì | sì | completo |  | fonte=free_exercise_db |
| 412 | Elbow to Knee | elbow-to-knee \| Elbow_to_Knee | sì | sì | completo |  | fonte=free_exercise_db |
| 413 | Elbows Back | elbows-back \| Elbows_Back | sì | sì | completo |  | fonte=free_exercise_db |
| 414 | Elevated Back Lunge | elevated-back-lunge \| Elevated_Back_Lunge | sì | sì | completo |  | fonte=free_exercise_db |
| 415 | Elevated Cable Rows | elevated-cable-rows \| Elevated_Cable_Rows | sì | sì | completo |  | fonte=free_exercise_db |
| 416 | Elliptical Trainer | elliptical-trainer \| Elliptical_Trainer | sì | sì | completo |  | fonte=free_exercise_db |
| 417 | Exercise Ball Crunch | exercise-ball-crunch \| Exercise_Ball_Crunch | sì | sì | completo |  | fonte=free_exercise_db |
| 418 | Exercise Ball Pull-In | exercise-ball-pull-in \| Exercise_Ball_Pull-In | sì | sì | completo |  | fonte=free_exercise_db |
| 419 | Extended Range One-Arm Kettlebell Floor Press | extended-range-one-arm-kettlebell-floor-press \| Extended_Range_One-Arm_Kettlebell_Floor_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 420 | External Rotation | external-rotation \| External_Rotation | sì | sì | completo |  | fonte=free_exercise_db |
| 421 | External Rotation with Band | external-rotation-with-band \| External_Rotation_with_Band | sì | sì | completo |  | fonte=free_exercise_db |
| 422 | External Rotation with Cable | external-rotation-with-cable \| External_Rotation_with_Cable | sì | sì | completo |  | fonte=free_exercise_db |
| 423 | Farmer's Walk | farmers-walk \| Farmers_Walk | sì | sì | completo |  | fonte=free_exercise_db |
| 424 | Fast Skipping | fast-skipping \| Fast_Skipping | sì | sì | completo |  | fonte=free_exercise_db |
| 425 | Finger Curls | finger-curls \| Finger_Curls | sì | sì | completo |  | fonte=free_exercise_db |
| 426 | Flat Bench Cable Flyes | flat-bench-cable-flyes \| Flat_Bench_Cable_Flyes | sì | sì | completo |  | fonte=free_exercise_db |
| 427 | Flat Bench Leg Pull-In | flat-bench-leg-pull-in \| Flat_Bench_Leg_Pull-In | sì | sì | completo |  | fonte=free_exercise_db |
| 428 | Flat Bench Lying Leg Raise | flat-bench-lying-leg-raise \| Flat_Bench_Lying_Leg_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 429 | Flexor Incline Dumbbell Curls | flexor-incline-dumbbell-curls \| Flexor_Incline_Dumbbell_Curls | sì | sì | completo |  | fonte=free_exercise_db |
| 430 | Floor Glute-Ham Raise | floor-glute-ham-raise \| Floor_Glute-Ham_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 431 | Floor Press | floor-press \| Floor_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 432 | Floor Press with Chains | floor-press-with-chains \| Floor_Press_with_Chains | sì | sì | completo |  | fonte=free_exercise_db |
| 433 | Flutter Kicks | flutter-kicks \| Flutter_Kicks | sì | sì | completo |  | fonte=free_exercise_db |
| 434 | Foot-SMR | foot-smr \| Foot-SMR | sì | sì | completo |  | fonte=free_exercise_db |
| 435 | Forward Drag with Press | forward-drag-with-press \| Forward_Drag_with_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 436 | Frankenstein Squat | frankenstein-squat \| Frankenstein_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 437 | Freehand Jump Squat | freehand-jump-squat \| Freehand_Jump_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 438 | Frog Hops | frog-hops \| Frog_Hops | sì | sì | completo |  | fonte=free_exercise_db |
| 439 | Frog Sit-Ups | frog-sit-ups \| Frog_Sit-Ups | sì | sì | completo |  | fonte=free_exercise_db |
| 440 | Front Barbell Squat | front-barbell-squat \| Front_Barbell_Squat | sì | sì | completo | 80: Front squat [front-squat] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 441 | Front Barbell Squat To A Bench | front-barbell-squat-to-a-bench \| Front_Barbell_Squat_To_A_Bench | sì | sì | completo |  | fonte=free_exercise_db |
| 442 | Front Box Jump | front-box-jump \| Front_Box_Jump | sì | sì | completo |  | fonte=free_exercise_db |
| 443 | Front Cable Raise | front-cable-raise \| Front_Cable_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 444 | Front Cone Hops (or hurdle hops) | front-cone-hops-or-hurdle-hops \| Front_Cone_Hops_or_hurdle_hops | sì | sì | completo |  | fonte=free_exercise_db |
| 445 | Front Dumbbell Raise | front-dumbbell-raise \| Front_Dumbbell_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 446 | Front Incline Dumbbell Raise | front-incline-dumbbell-raise \| Front_Incline_Dumbbell_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 447 | Front Leg Raises | front-leg-raises \| Front_Leg_Raises | sì | sì | completo |  | fonte=free_exercise_db |
| 448 | Front Plate Raise | front-plate-raise \| Front_Plate_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 449 | Front Raise And Pullover | front-raise-and-pullover \| Front_Raise_And_Pullover | sì | sì | completo |  | fonte=free_exercise_db |
| 450 | Front Squat (Clean Grip) | front-squat-clean-grip \| Front_Squat_Clean_Grip | sì | sì | completo |  | fonte=free_exercise_db |
| 451 | Front Squats With Two Kettlebells | front-squats-with-two-kettlebells \| Front_Squats_With_Two_Kettlebells | sì | sì | completo |  | fonte=free_exercise_db |
| 452 | Front Two-Dumbbell Raise | front-two-dumbbell-raise \| Front_Two-Dumbbell_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 453 | Full Range-Of-Motion Lat Pulldown | full-range-of-motion-lat-pulldown \| Full_Range-Of-Motion_Lat_Pulldown | sì | sì | completo |  | fonte=free_exercise_db |
| 454 | Gironda Sternum Chins | gironda-sternum-chins \| Gironda_Sternum_Chins | sì | sì | completo |  | fonte=free_exercise_db |
| 455 | Glute Ham Raise | glute-ham-raise \| Glute_Ham_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 456 | Glute Kickback | glute-kickback \| Glute_Kickback | sì | sì | completo |  | fonte=free_exercise_db |
| 457 | Good Morning off Pins | good-morning-off-pins \| Good_Morning_off_Pins | sì | sì | completo |  | fonte=free_exercise_db |
| 458 | Gorilla Chin/Crunch | gorilla-chin-crunch \| Gorilla_Chin_Crunch | sì | sì | completo |  | fonte=free_exercise_db |
| 459 | Groin and Back Stretch | groin-and-back-stretch \| Groin_and_Back_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 460 | Groiners | groiners \| Groiners | sì | sì | completo |  | fonte=free_exercise_db |
| 461 | Hammer Curls | hammer-curls \| Hammer_Curls | sì | sì | completo | 112: Hammer curl [hammer-curl] (canonical_tokens,slug_similar,name_similar,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 462 | Hammer Grip Incline DB Bench Press | hammer-grip-incline-db-bench-press \| Hammer_Grip_Incline_DB_Bench_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 463 | Hamstring-SMR | hamstring-smr \| Hamstring-SMR | sì | sì | completo |  | fonte=free_exercise_db |
| 464 | Handstand Push-Ups | handstand-push-ups \| Handstand_Push-Ups | sì | sì | completo |  | fonte=free_exercise_db |
| 465 | Hang Clean | hang-clean \| Hang_Clean | sì | sì | completo |  | fonte=free_exercise_db |
| 466 | Hang Clean - Below the Knees | hang-clean-below-the-knees \| Hang_Clean_-_Below_the_Knees | sì | sì | completo |  | fonte=free_exercise_db |
| 467 | Hang Snatch | hang-snatch \| Hang_Snatch | sì | sì | completo |  | fonte=free_exercise_db |
| 468 | Hang Snatch - Below Knees | hang-snatch-below-knees \| Hang_Snatch_-_Below_Knees | sì | sì | completo |  | fonte=free_exercise_db |
| 469 | Hanging Bar Good Morning | hanging-bar-good-morning \| Hanging_Bar_Good_Morning | sì | sì | completo |  | fonte=free_exercise_db |
| 470 | Hanging Leg Raise | hanging-leg-raise \| Hanging_Leg_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 471 | Hanging Pike | hanging-pike \| Hanging_Pike | sì | sì | completo |  | fonte=free_exercise_db |
| 472 | Heaving Snatch Balance | heaving-snatch-balance \| Heaving_Snatch_Balance | sì | sì | completo |  | fonte=free_exercise_db |
| 473 | Heavy Bag Thrust | heavy-bag-thrust \| Heavy_Bag_Thrust | sì | sì | completo |  | fonte=free_exercise_db |
| 474 | High Cable Curls | high-cable-curls \| High_Cable_Curls | sì | sì | completo |  | fonte=free_exercise_db |
| 475 | Hip Circles (prone) | hip-circles-prone \| Hip_Circles_prone | sì | sì | completo |  | fonte=free_exercise_db |
| 476 | Hip Extension with Bands | hip-extension-with-bands \| Hip_Extension_with_Bands | sì | sì | completo |  | fonte=free_exercise_db |
| 477 | Hip Flexion with Band | hip-flexion-with-band \| Hip_Flexion_with_Band | sì | sì | completo |  | fonte=free_exercise_db |
| 478 | Hip Lift with Band | hip-lift-with-band \| Hip_Lift_with_Band | sì | sì | completo |  | fonte=free_exercise_db |
| 479 | Hug A Ball | hug-a-ball \| Hug_A_Ball | sì | sì | completo |  | fonte=free_exercise_db |
| 480 | Hug Knees To Chest | hug-knees-to-chest \| Hug_Knees_To_Chest | sì | sì | completo |  | fonte=free_exercise_db |
| 481 | Hurdle Hops | hurdle-hops \| Hurdle_Hops | sì | sì | completo |  | fonte=free_exercise_db |
| 482 | Hyperextensions (Back Extensions) | hyperextensions-back-extensions \| Hyperextensions_Back_Extensions | sì | sì | completo |  | fonte=free_exercise_db |
| 483 | Hyperextensions With No Hyperextension Bench | hyperextensions-with-no-hyperextension-bench \| Hyperextensions_With_No_Hyperextension_Bench | sì | sì | completo |  | fonte=free_exercise_db |
| 484 | IT Band and Glute Stretch | it-band-and-glute-stretch \| IT_Band_and_Glute_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 485 | Iliotibial Tract-SMR | iliotibial-tract-smr \| Iliotibial_Tract-SMR | sì | sì | completo |  | fonte=free_exercise_db |
| 486 | Inchworm | inchworm \| Inchworm | sì | sì | completo |  | fonte=free_exercise_db |
| 487 | Incline Barbell Triceps Extension | incline-barbell-triceps-extension \| Incline_Barbell_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 488 | Incline Bench Pull | incline-bench-pull \| Incline_Bench_Pull | sì | sì | completo |  | fonte=free_exercise_db |
| 489 | Incline Cable Chest Press | incline-cable-chest-press \| Incline_Cable_Chest_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 490 | Incline Cable Flye | incline-cable-flye \| Incline_Cable_Flye | sì | sì | completo |  | fonte=free_exercise_db |
| 491 | Incline Dumbbell Bench With Palms Facing In | incline-dumbbell-bench-with-palms-facing-in \| Incline_Dumbbell_Bench_With_Palms_Facing_In | sì | sì | completo |  | fonte=free_exercise_db |
| 492 | Incline Dumbbell Curl | incline-dumbbell-curl \| Incline_Dumbbell_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 493 | Incline Dumbbell Flyes | incline-dumbbell-flyes \| Incline_Dumbbell_Flyes | sì | sì | completo |  | fonte=free_exercise_db |
| 494 | Incline Dumbbell Flyes - With A Twist | incline-dumbbell-flyes-with-a-twist \| Incline_Dumbbell_Flyes_-_With_A_Twist | sì | sì | completo |  | fonte=free_exercise_db |
| 495 | Incline Hammer Curls | incline-hammer-curls \| Incline_Hammer_Curls | sì | sì | completo |  | fonte=free_exercise_db |
| 496 | Incline Inner Biceps Curl | incline-inner-biceps-curl \| Incline_Inner_Biceps_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 497 | Incline Push-Up | incline-push-up \| Incline_Push-Up | sì | sì | completo |  | fonte=free_exercise_db |
| 498 | Incline Push-Up Close-Grip | incline-push-up-close-grip \| Incline_Push-Up_Close-Grip | sì | sì | completo |  | fonte=free_exercise_db |
| 499 | Incline Push-Up Depth Jump | incline-push-up-depth-jump \| Incline_Push-Up_Depth_Jump | sì | sì | completo |  | fonte=free_exercise_db |
| 500 | Incline Push-Up Medium | incline-push-up-medium \| Incline_Push-Up_Medium | sì | sì | completo |  | fonte=free_exercise_db |
| 501 | Incline Push-Up Reverse Grip | incline-push-up-reverse-grip \| Incline_Push-Up_Reverse_Grip | sì | sì | completo |  | fonte=free_exercise_db |
| 502 | Incline Push-Up Wide | incline-push-up-wide \| Incline_Push-Up_Wide | sì | sì | completo |  | fonte=free_exercise_db |
| 503 | Intermediate Groin Stretch | intermediate-groin-stretch \| Intermediate_Groin_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 504 | Intermediate Hip Flexor and Quad Stretch | intermediate-hip-flexor-and-quad-stretch \| Intermediate_Hip_Flexor_and_Quad_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 505 | Internal Rotation with Band | internal-rotation-with-band \| Internal_Rotation_with_Band | sì | sì | completo |  | fonte=free_exercise_db |
| 506 | Inverted Row with Straps | inverted-row-with-straps \| Inverted_Row_with_Straps | sì | sì | completo |  | fonte=free_exercise_db |
| 507 | Iron Cross | iron-cross \| Iron_Cross | sì | sì | completo |  | fonte=free_exercise_db |
| 508 | Iron Crosses (stretch) | iron-crosses-stretch \| Iron_Crosses_stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 509 | Isometric Chest Squeezes | isometric-chest-squeezes \| Isometric_Chest_Squeezes | sì | sì | completo |  | fonte=free_exercise_db |
| 510 | Isometric Neck Exercise - Front And Back | isometric-neck-exercise-front-and-back \| Isometric_Neck_Exercise_-_Front_And_Back | sì | sì | completo |  | fonte=free_exercise_db |
| 511 | Isometric Neck Exercise - Sides | isometric-neck-exercise-sides \| Isometric_Neck_Exercise_-_Sides | sì | sì | completo |  | fonte=free_exercise_db |
| 512 | Isometric Wipers | isometric-wipers \| Isometric_Wipers | sì | sì | completo |  | fonte=free_exercise_db |
| 513 | JM Press | jm-press \| JM_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 514 | Jackknife Sit-Up | jackknife-sit-up \| Jackknife_Sit-Up | sì | sì | completo |  | fonte=free_exercise_db |
| 515 | Janda Sit-Up | janda-sit-up \| Janda_Sit-Up | sì | sì | completo |  | fonte=free_exercise_db |
| 516 | Jefferson Squats | jefferson-squats \| Jefferson_Squats | sì | sì | completo |  | fonte=free_exercise_db |
| 517 | Jerk Balance | jerk-balance \| Jerk_Balance | sì | sì | completo |  | fonte=free_exercise_db |
| 518 | Jerk Dip Squat | jerk-dip-squat \| Jerk_Dip_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 519 | Jogging, Treadmill | jogging-treadmill \| Jogging_Treadmill | sì | sì | completo |  | fonte=free_exercise_db |
| 520 | Keg Load | keg-load \| Keg_Load | sì | sì | completo |  | fonte=free_exercise_db |
| 521 | Kettlebell Arnold Press | kettlebell-arnold-press \| Kettlebell_Arnold_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 522 | Kettlebell Dead Clean | kettlebell-dead-clean \| Kettlebell_Dead_Clean | sì | sì | completo |  | fonte=free_exercise_db |
| 523 | Kettlebell Figure 8 | kettlebell-figure-8 \| Kettlebell_Figure_8 | sì | sì | completo |  | fonte=free_exercise_db |
| 524 | Kettlebell Hang Clean | kettlebell-hang-clean \| Kettlebell_Hang_Clean | sì | sì | completo |  | fonte=free_exercise_db |
| 525 | Kettlebell One-Legged Deadlift | kettlebell-one-legged-deadlift \| Kettlebell_One-Legged_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 526 | Kettlebell Pass Between The Legs | kettlebell-pass-between-the-legs \| Kettlebell_Pass_Between_The_Legs | sì | sì | completo |  | fonte=free_exercise_db |
| 527 | Kettlebell Pirate Ships | kettlebell-pirate-ships \| Kettlebell_Pirate_Ships | sì | sì | completo |  | fonte=free_exercise_db |
| 528 | Kettlebell Pistol Squat | kettlebell-pistol-squat \| Kettlebell_Pistol_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 529 | Kettlebell Seated Press | kettlebell-seated-press \| Kettlebell_Seated_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 530 | Kettlebell Seesaw Press | kettlebell-seesaw-press \| Kettlebell_Seesaw_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 531 | Kettlebell Sumo High Pull | kettlebell-sumo-high-pull \| Kettlebell_Sumo_High_Pull | sì | sì | completo |  | fonte=free_exercise_db |
| 532 | Kettlebell Thruster | kettlebell-thruster \| Kettlebell_Thruster | sì | sì | completo |  | fonte=free_exercise_db |
| 533 | Kettlebell Turkish Get-Up (Lunge style) | kettlebell-turkish-get-up-lunge-style \| Kettlebell_Turkish_Get-Up_Lunge_style | sì | sì | completo |  | fonte=free_exercise_db |
| 534 | Kettlebell Turkish Get-Up (Squat style) | kettlebell-turkish-get-up-squat-style \| Kettlebell_Turkish_Get-Up_Squat_style | sì | sì | completo |  | fonte=free_exercise_db |
| 535 | Kettlebell Windmill | kettlebell-windmill \| Kettlebell_Windmill | sì | sì | completo |  | fonte=free_exercise_db |
| 536 | Kipping Muscle Up | kipping-muscle-up \| Kipping_Muscle_Up | sì | sì | completo |  | fonte=free_exercise_db |
| 537 | Knee Across The Body | knee-across-the-body \| Knee_Across_The_Body | sì | sì | completo |  | fonte=free_exercise_db |
| 538 | Knee Circles | knee-circles \| Knee_Circles | sì | sì | completo |  | fonte=free_exercise_db |
| 539 | Knee/Hip Raise On Parallel Bars | knee-hip-raise-on-parallel-bars \| Knee_Hip_Raise_On_Parallel_Bars | sì | sì | completo |  | fonte=free_exercise_db |
| 540 | Knee Tuck Jump | knee-tuck-jump \| Knee_Tuck_Jump | sì | sì | completo |  | fonte=free_exercise_db |
| 541 | Kneeling Arm Drill | kneeling-arm-drill \| Kneeling_Arm_Drill | sì | sì | completo |  | fonte=free_exercise_db |
| 542 | Kneeling Cable Crunch With Alternating Oblique Twists | kneeling-cable-crunch-with-alternating-oblique-twists \| Kneeling_Cable_Crunch_With_Alternating_Oblique_Twists | sì | sì | completo |  | fonte=free_exercise_db |
| 543 | Kneeling Cable Triceps Extension | kneeling-cable-triceps-extension \| Kneeling_Cable_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 544 | Kneeling Forearm Stretch | kneeling-forearm-stretch \| Kneeling_Forearm_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 545 | Kneeling High Pulley Row | kneeling-high-pulley-row \| Kneeling_High_Pulley_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 546 | Kneeling Hip Flexor | kneeling-hip-flexor \| Kneeling_Hip_Flexor | sì | sì | completo |  | fonte=free_exercise_db |
| 547 | Kneeling Jump Squat | kneeling-jump-squat \| Kneeling_Jump_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 548 | Kneeling Single-Arm High Pulley Row | kneeling-single-arm-high-pulley-row \| Kneeling_Single-Arm_High_Pulley_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 549 | Kneeling Squat | kneeling-squat \| Kneeling_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 550 | Landmine 180's | landmine-180s \| Landmine_180s | sì | sì | completo |  | fonte=free_exercise_db |
| 551 | Landmine Linear Jammer | landmine-linear-jammer \| Landmine_Linear_Jammer | sì | sì | completo |  | fonte=free_exercise_db |
| 552 | Lateral Bound | lateral-bound \| Lateral_Bound | sì | sì | completo |  | fonte=free_exercise_db |
| 553 | Lateral Box Jump | lateral-box-jump \| Lateral_Box_Jump | sì | sì | completo |  | fonte=free_exercise_db |
| 554 | Lateral Cone Hops | lateral-cone-hops \| Lateral_Cone_Hops | sì | sì | completo |  | fonte=free_exercise_db |
| 555 | Lateral Raise - With Bands | lateral-raise-with-bands \| Lateral_Raise_-_With_Bands | sì | sì | completo |  | fonte=free_exercise_db |
| 556 | Latissimus Dorsi-SMR | latissimus-dorsi-smr \| Latissimus_Dorsi-SMR | sì | sì | completo |  | fonte=free_exercise_db |
| 557 | Leg-Over Floor Press | leg-over-floor-press \| Leg-Over_Floor_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 558 | Leg-Up Hamstring Stretch | leg-up-hamstring-stretch \| Leg-Up_Hamstring_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 559 | Leg Extensions | leg-extensions \| Leg_Extensions | sì | sì | completo | 82: Leg extension [leg-extension] (canonical_tokens,slug_similar,name_similar,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 560 | Leg Lift | leg-lift \| Leg_Lift | sì | sì | completo |  | fonte=free_exercise_db |
| 561 | Leg Pull-In | leg-pull-in \| Leg_Pull-In | sì | sì | completo |  | fonte=free_exercise_db |
| 562 | Leverage Chest Press | leverage-chest-press \| Leverage_Chest_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 563 | Leverage Deadlift | leverage-deadlift \| Leverage_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 564 | Leverage Decline Chest Press | leverage-decline-chest-press \| Leverage_Decline_Chest_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 565 | Leverage High Row | leverage-high-row \| Leverage_High_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 566 | Leverage Incline Chest Press | leverage-incline-chest-press \| Leverage_Incline_Chest_Press | sì | sì | completo | 43: Chest press inclinata [chest-press-inclinata] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 567 | Leverage Iso Row | leverage-iso-row \| Leverage_Iso_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 568 | Leverage Shoulder Press | leverage-shoulder-press \| Leverage_Shoulder_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 569 | Leverage Shrug | leverage-shrug \| Leverage_Shrug | sì | sì | completo |  | fonte=free_exercise_db |
| 570 | Linear 3-Part Start Technique | linear-3-part-start-technique \| Linear_3-Part_Start_Technique | sì | sì | completo |  | fonte=free_exercise_db |
| 571 | Linear Acceleration Wall Drill | linear-acceleration-wall-drill \| Linear_Acceleration_Wall_Drill | sì | sì | completo |  | fonte=free_exercise_db |
| 572 | Linear Depth Jump | linear-depth-jump \| Linear_Depth_Jump | sì | sì | completo |  | fonte=free_exercise_db |
| 573 | Log Lift | log-lift \| Log_Lift | sì | sì | completo |  | fonte=free_exercise_db |
| 574 | London Bridges | london-bridges \| London_Bridges | sì | sì | completo |  | fonte=free_exercise_db |
| 575 | Looking At Ceiling | looking-at-ceiling \| Looking_At_Ceiling | sì | sì | completo |  | fonte=free_exercise_db |
| 576 | Low Cable Crossover | low-cable-crossover \| Low_Cable_Crossover | sì | sì | completo |  | fonte=free_exercise_db |
| 577 | Low Cable Triceps Extension | low-cable-triceps-extension \| Low_Cable_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 578 | Low Pulley Row To Neck | low-pulley-row-to-neck \| Low_Pulley_Row_To_Neck | sì | sì | completo |  | fonte=free_exercise_db |
| 579 | Lower Back-SMR | lower-back-smr \| Lower_Back-SMR | sì | sì | completo |  | fonte=free_exercise_db |
| 580 | Lower Back Curl | lower-back-curl \| Lower_Back_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 581 | Lunge Pass Through | lunge-pass-through \| Lunge_Pass_Through | sì | sì | completo |  | fonte=free_exercise_db |
| 582 | Lunge Sprint | lunge-sprint \| Lunge_Sprint | sì | sì | completo |  | fonte=free_exercise_db |
| 583 | Lying Bent Leg Groin | lying-bent-leg-groin \| Lying_Bent_Leg_Groin | sì | sì | completo |  | fonte=free_exercise_db |
| 584 | Lying Cable Curl | lying-cable-curl \| Lying_Cable_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 585 | Lying Cambered Barbell Row | lying-cambered-barbell-row \| Lying_Cambered_Barbell_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 586 | Lying Close-Grip Bar Curl On High Pulley | lying-close-grip-bar-curl-on-high-pulley \| Lying_Close-Grip_Bar_Curl_On_High_Pulley | sì | sì | completo |  | fonte=free_exercise_db |
| 587 | Lying Close-Grip Barbell Triceps Extension Behind The Head | lying-close-grip-barbell-triceps-extension-behind-the-head \| Lying_Close-Grip_Barbell_Triceps_Extension_Behind_The_Head | sì | sì | completo |  | fonte=free_exercise_db |
| 588 | Lying Close-Grip Barbell Triceps Press To Chin | lying-close-grip-barbell-triceps-press-to-chin \| Lying_Close-Grip_Barbell_Triceps_Press_To_Chin | sì | sì | completo |  | fonte=free_exercise_db |
| 589 | Lying Crossover | lying-crossover \| Lying_Crossover | sì | sì | completo |  | fonte=free_exercise_db |
| 590 | Lying Dumbbell Tricep Extension | lying-dumbbell-tricep-extension \| Lying_Dumbbell_Tricep_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 591 | Lying Face Down Plate Neck Resistance | lying-face-down-plate-neck-resistance \| Lying_Face_Down_Plate_Neck_Resistance | sì | sì | completo |  | fonte=free_exercise_db |
| 592 | Lying Face Up Plate Neck Resistance | lying-face-up-plate-neck-resistance \| Lying_Face_Up_Plate_Neck_Resistance | sì | sì | completo |  | fonte=free_exercise_db |
| 593 | Lying Glute | lying-glute \| Lying_Glute | sì | sì | completo |  | fonte=free_exercise_db |
| 594 | Lying Hamstring | lying-hamstring \| Lying_Hamstring | sì | sì | completo |  | fonte=free_exercise_db |
| 595 | Lying High Bench Barbell Curl | lying-high-bench-barbell-curl \| Lying_High_Bench_Barbell_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 596 | Lying Leg Curls | lying-leg-curls \| Lying_Leg_Curls | sì | sì | completo |  | fonte=free_exercise_db |
| 597 | Lying Machine Squat | lying-machine-squat \| Lying_Machine_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 598 | Lying One-Arm Lateral Raise | lying-one-arm-lateral-raise \| Lying_One-Arm_Lateral_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 599 | Lying Prone Quadriceps | lying-prone-quadriceps \| Lying_Prone_Quadriceps | sì | sì | completo |  | fonte=free_exercise_db |
| 600 | Lying Rear Delt Raise | lying-rear-delt-raise \| Lying_Rear_Delt_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 601 | Lying Supine Dumbbell Curl | lying-supine-dumbbell-curl \| Lying_Supine_Dumbbell_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 602 | Lying T-Bar Row | lying-t-bar-row \| Lying_T-Bar_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 603 | Lying Triceps Press | lying-triceps-press \| Lying_Triceps_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 604 | Machine Bench Press | machine-bench-press \| Machine_Bench_Press | sì | sì | completo | 13: Chest press macchina [chest-press-macchina] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 605 | Machine Bicep Curl | machine-bicep-curl \| Machine_Bicep_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 606 | Machine Preacher Curls | machine-preacher-curls \| Machine_Preacher_Curls | sì | sì | completo | 116: Preacher curl macchina [preacher-curl-macchina] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 607 | Machine Shoulder (Military) Press | machine-shoulder-military-press \| Machine_Shoulder_Military_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 608 | Machine Triceps Extension | machine-triceps-extension \| Machine_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 609 | Medicine Ball Chest Pass | medicine-ball-chest-pass \| Medicine_Ball_Chest_Pass | sì | sì | completo |  | fonte=free_exercise_db |
| 610 | Medicine Ball Full Twist | medicine-ball-full-twist \| Medicine_Ball_Full_Twist | sì | sì | completo |  | fonte=free_exercise_db |
| 611 | Medicine Ball Scoop Throw | medicine-ball-scoop-throw \| Medicine_Ball_Scoop_Throw | sì | sì | completo |  | fonte=free_exercise_db |
| 612 | Middle Back Shrug | middle-back-shrug \| Middle_Back_Shrug | sì | sì | completo |  | fonte=free_exercise_db |
| 613 | Middle Back Stretch | middle-back-stretch \| Middle_Back_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 614 | Mixed Grip Chin | mixed-grip-chin \| Mixed_Grip_Chin | sì | sì | completo |  | fonte=free_exercise_db |
| 615 | Monster Walk | monster-walk \| Monster_Walk | sì | sì | completo |  | fonte=free_exercise_db |
| 616 | Mountain Climbers | mountain-climbers \| Mountain_Climbers | sì | sì | completo |  | fonte=free_exercise_db |
| 617 | Moving Claw Series | moving-claw-series \| Moving_Claw_Series | sì | sì | completo |  | fonte=free_exercise_db |
| 618 | Muscle Snatch | muscle-snatch \| Muscle_Snatch | sì | sì | completo |  | fonte=free_exercise_db |
| 619 | Muscle Up | muscle-up \| Muscle_Up | sì | sì | completo |  | fonte=free_exercise_db |
| 620 | Narrow Stance Hack Squats | narrow-stance-hack-squats \| Narrow_Stance_Hack_Squats | sì | sì | completo |  | fonte=free_exercise_db |
| 621 | Narrow Stance Leg Press | narrow-stance-leg-press \| Narrow_Stance_Leg_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 622 | Narrow Stance Squats | narrow-stance-squats \| Narrow_Stance_Squats | sì | sì | completo |  | fonte=free_exercise_db |
| 623 | Natural Glute Ham Raise | natural-glute-ham-raise \| Natural_Glute_Ham_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 624 | Neck-SMR | neck-smr \| Neck-SMR | sì | sì | completo |  | fonte=free_exercise_db |
| 625 | Neck Press | neck-press \| Neck_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 626 | Oblique Crunches | oblique-crunches \| Oblique_Crunches | sì | sì | completo |  | fonte=free_exercise_db |
| 627 | Oblique Crunches - On The Floor | oblique-crunches-on-the-floor \| Oblique_Crunches_-_On_The_Floor | sì | sì | completo |  | fonte=free_exercise_db |
| 628 | Olympic Squat | olympic-squat \| Olympic_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 629 | On-Your-Back Quad Stretch | on-your-back-quad-stretch \| On-Your-Back_Quad_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 630 | On Your Side Quad Stretch | on-your-side-quad-stretch \| On_Your_Side_Quad_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 631 | One-Arm Dumbbell Row | one-arm-dumbbell-row \| One-Arm_Dumbbell_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 632 | One-Arm Flat Bench Dumbbell Flye | one-arm-flat-bench-dumbbell-flye \| One-Arm_Flat_Bench_Dumbbell_Flye | sì | sì | completo |  | fonte=free_exercise_db |
| 633 | One-Arm High-Pulley Cable Side Bends | one-arm-high-pulley-cable-side-bends \| One-Arm_High-Pulley_Cable_Side_Bends | sì | sì | completo |  | fonte=free_exercise_db |
| 634 | One-Arm Incline Lateral Raise | one-arm-incline-lateral-raise \| One-Arm_Incline_Lateral_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 635 | One-Arm Kettlebell Clean | one-arm-kettlebell-clean \| One-Arm_Kettlebell_Clean | sì | sì | completo |  | fonte=free_exercise_db |
| 636 | One-Arm Kettlebell Clean and Jerk | one-arm-kettlebell-clean-and-jerk \| One-Arm_Kettlebell_Clean_and_Jerk | sì | sì | completo |  | fonte=free_exercise_db |
| 637 | One-Arm Kettlebell Floor Press | one-arm-kettlebell-floor-press \| One-Arm_Kettlebell_Floor_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 638 | One-Arm Kettlebell Jerk | one-arm-kettlebell-jerk \| One-Arm_Kettlebell_Jerk | sì | sì | completo |  | fonte=free_exercise_db |
| 639 | One-Arm Kettlebell Military Press To The Side | one-arm-kettlebell-military-press-to-the-side \| One-Arm_Kettlebell_Military_Press_To_The_Side | sì | sì | completo |  | fonte=free_exercise_db |
| 640 | One-Arm Kettlebell Para Press | one-arm-kettlebell-para-press \| One-Arm_Kettlebell_Para_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 641 | One-Arm Kettlebell Push Press | one-arm-kettlebell-push-press \| One-Arm_Kettlebell_Push_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 642 | One-Arm Kettlebell Row | one-arm-kettlebell-row \| One-Arm_Kettlebell_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 643 | One-Arm Kettlebell Snatch | one-arm-kettlebell-snatch \| One-Arm_Kettlebell_Snatch | sì | sì | completo |  | fonte=free_exercise_db |
| 644 | One-Arm Kettlebell Split Jerk | one-arm-kettlebell-split-jerk \| One-Arm_Kettlebell_Split_Jerk | sì | sì | completo |  | fonte=free_exercise_db |
| 645 | One-Arm Kettlebell Split Snatch | one-arm-kettlebell-split-snatch \| One-Arm_Kettlebell_Split_Snatch | sì | sì | completo |  | fonte=free_exercise_db |
| 646 | One-Arm Kettlebell Swings | one-arm-kettlebell-swings \| One-Arm_Kettlebell_Swings | sì | sì | completo |  | fonte=free_exercise_db |
| 647 | One-Arm Long Bar Row | one-arm-long-bar-row \| One-Arm_Long_Bar_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 648 | One-Arm Medicine Ball Slam | one-arm-medicine-ball-slam \| One-Arm_Medicine_Ball_Slam | sì | sì | completo |  | fonte=free_exercise_db |
| 649 | One-Arm Open Palm Kettlebell Clean | one-arm-open-palm-kettlebell-clean \| One-Arm_Open_Palm_Kettlebell_Clean | sì | sì | completo |  | fonte=free_exercise_db |
| 650 | One-Arm Overhead Kettlebell Squats | one-arm-overhead-kettlebell-squats \| One-Arm_Overhead_Kettlebell_Squats | sì | sì | completo |  | fonte=free_exercise_db |
| 651 | One-Arm Side Deadlift | one-arm-side-deadlift \| One-Arm_Side_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 652 | One-Arm Side Laterals | one-arm-side-laterals \| One-Arm_Side_Laterals | sì | sì | completo |  | fonte=free_exercise_db |
| 653 | One-Legged Cable Kickback | one-legged-cable-kickback \| One-Legged_Cable_Kickback | sì | sì | completo |  | fonte=free_exercise_db |
| 654 | One Arm Against Wall | one-arm-against-wall \| One_Arm_Against_Wall | sì | sì | completo |  | fonte=free_exercise_db |
| 655 | One Arm Chin-Up | one-arm-chin-up \| One_Arm_Chin-Up | sì | sì | completo |  | fonte=free_exercise_db |
| 656 | One Arm Dumbbell Bench Press | one-arm-dumbbell-bench-press \| One_Arm_Dumbbell_Bench_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 657 | One Arm Dumbbell Preacher Curl | one-arm-dumbbell-preacher-curl \| One_Arm_Dumbbell_Preacher_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 658 | One Arm Floor Press | one-arm-floor-press \| One_Arm_Floor_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 659 | One Arm Lat Pulldown | one-arm-lat-pulldown \| One_Arm_Lat_Pulldown | sì | sì | completo |  | fonte=free_exercise_db |
| 660 | One Arm Pronated Dumbbell Triceps Extension | one-arm-pronated-dumbbell-triceps-extension \| One_Arm_Pronated_Dumbbell_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 661 | One Arm Supinated Dumbbell Triceps Extension | one-arm-supinated-dumbbell-triceps-extension \| One_Arm_Supinated_Dumbbell_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 662 | One Half Locust | one-half-locust \| One_Half_Locust | sì | sì | completo |  | fonte=free_exercise_db |
| 663 | One Handed Hang | one-handed-hang \| One_Handed_Hang | sì | sì | completo |  | fonte=free_exercise_db |
| 664 | One Knee To Chest | one-knee-to-chest \| One_Knee_To_Chest | sì | sì | completo |  | fonte=free_exercise_db |
| 665 | One Leg Barbell Squat | one-leg-barbell-squat \| One_Leg_Barbell_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 666 | Open Palm Kettlebell Clean | open-palm-kettlebell-clean \| Open_Palm_Kettlebell_Clean | sì | sì | completo |  | fonte=free_exercise_db |
| 667 | Otis-Up | otis-up \| Otis-Up | sì | sì | completo |  | fonte=free_exercise_db |
| 668 | Overhead Cable Curl | overhead-cable-curl \| Overhead_Cable_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 669 | Overhead Lat | overhead-lat \| Overhead_Lat | sì | sì | completo |  | fonte=free_exercise_db |
| 670 | Overhead Slam | overhead-slam \| Overhead_Slam | sì | sì | completo |  | fonte=free_exercise_db |
| 671 | Overhead Squat | overhead-squat \| Overhead_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 672 | Overhead Stretch | overhead-stretch \| Overhead_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 673 | Overhead Triceps | overhead-triceps \| Overhead_Triceps | sì | sì | completo |  | fonte=free_exercise_db |
| 674 | Pallof Press With Rotation | pallof-press-with-rotation \| Pallof_Press_With_Rotation | sì | sì | completo |  | fonte=free_exercise_db |
| 675 | Palms-Down Dumbbell Wrist Curl Over A Bench | palms-down-dumbbell-wrist-curl-over-a-bench \| Palms-Down_Dumbbell_Wrist_Curl_Over_A_Bench | sì | sì | completo |  | fonte=free_exercise_db |
| 676 | Palms-Down Wrist Curl Over A Bench | palms-down-wrist-curl-over-a-bench \| Palms-Down_Wrist_Curl_Over_A_Bench | sì | sì | completo |  | fonte=free_exercise_db |
| 677 | Palms-Up Barbell Wrist Curl Over A Bench | palms-up-barbell-wrist-curl-over-a-bench \| Palms-Up_Barbell_Wrist_Curl_Over_A_Bench | sì | sì | completo |  | fonte=free_exercise_db |
| 678 | Palms-Up Dumbbell Wrist Curl Over A Bench | palms-up-dumbbell-wrist-curl-over-a-bench \| Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench | sì | sì | completo |  | fonte=free_exercise_db |
| 679 | Parallel Bar Dip | parallel-bar-dip \| Parallel_Bar_Dip | sì | sì | completo |  | fonte=free_exercise_db |
| 680 | Pelvic Tilt Into Bridge | pelvic-tilt-into-bridge \| Pelvic_Tilt_Into_Bridge | sì | sì | completo |  | fonte=free_exercise_db |
| 681 | Peroneals-SMR | peroneals-smr \| Peroneals-SMR | sì | sì | completo |  | fonte=free_exercise_db |
| 682 | Peroneals Stretch | peroneals-stretch \| Peroneals_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 683 | Physioball Hip Bridge | physioball-hip-bridge \| Physioball_Hip_Bridge | sì | sì | completo |  | fonte=free_exercise_db |
| 684 | Pin Presses | pin-presses \| Pin_Presses | sì | sì | completo |  | fonte=free_exercise_db |
| 685 | Piriformis-SMR | piriformis-smr \| Piriformis-SMR | sì | sì | completo |  | fonte=free_exercise_db |
| 686 | Plate Pinch | plate-pinch \| Plate_Pinch | sì | sì | completo |  | fonte=free_exercise_db |
| 687 | Plate Twist | plate-twist \| Plate_Twist | sì | sì | completo |  | fonte=free_exercise_db |
| 688 | Platform Hamstring Slides | platform-hamstring-slides \| Platform_Hamstring_Slides | sì | sì | completo |  | fonte=free_exercise_db |
| 689 | Plie Dumbbell Squat | plie-dumbbell-squat \| Plie_Dumbbell_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 690 | Plyo Kettlebell Pushups | plyo-kettlebell-pushups \| Plyo_Kettlebell_Pushups | sì | sì | completo |  | fonte=free_exercise_db |
| 691 | Plyo Push-up | plyo-push-up \| Plyo_Push-up | sì | sì | completo |  | fonte=free_exercise_db |
| 692 | Posterior Tibialis Stretch | posterior-tibialis-stretch \| Posterior_Tibialis_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 693 | Power Clean | power-clean \| Power_Clean | sì | sì | completo |  | fonte=free_exercise_db |
| 694 | Power Clean from Blocks | power-clean-from-blocks \| Power_Clean_from_Blocks | sì | sì | completo |  | fonte=free_exercise_db |
| 695 | Power Jerk | power-jerk \| Power_Jerk | sì | sì | completo |  | fonte=free_exercise_db |
| 696 | Power Partials | power-partials \| Power_Partials | sì | sì | completo |  | fonte=free_exercise_db |
| 697 | Power Snatch | power-snatch \| Power_Snatch | sì | sì | completo |  | fonte=free_exercise_db |
| 698 | Power Snatch from Blocks | power-snatch-from-blocks \| Power_Snatch_from_Blocks | sì | sì | completo |  | fonte=free_exercise_db |
| 699 | Power Stairs | power-stairs \| Power_Stairs | sì | sì | completo |  | fonte=free_exercise_db |
| 700 | Preacher Curl | preacher-curl \| Preacher_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 701 | Preacher Hammer Dumbbell Curl | preacher-hammer-dumbbell-curl \| Preacher_Hammer_Dumbbell_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 702 | Press Sit-Up | press-sit-up \| Press_Sit-Up | sì | sì | completo |  | fonte=free_exercise_db |
| 703 | Prone Manual Hamstring | prone-manual-hamstring \| Prone_Manual_Hamstring | sì | sì | completo |  | fonte=free_exercise_db |
| 704 | Prowler Sprint | prowler-sprint \| Prowler_Sprint | sì | sì | completo |  | fonte=free_exercise_db |
| 705 | Pull Through | pull-through \| Pull_Through | sì | sì | completo |  | fonte=free_exercise_db |
| 706 | Pullups | pullups \| Pullups | sì | sì | completo |  | fonte=free_exercise_db |
| 707 | Push-Up Wide | push-up-wide \| Push-Up_Wide | sì | sì | completo |  | fonte=free_exercise_db |
| 708 | Push-Ups - Close Triceps Position | push-ups-close-triceps-position \| Push-Ups_-_Close_Triceps_Position | sì | sì | completo |  | fonte=free_exercise_db |
| 709 | Push-Ups With Feet Elevated | push-ups-with-feet-elevated \| Push-Ups_With_Feet_Elevated | sì | sì | completo |  | fonte=free_exercise_db |
| 710 | Push-Ups With Feet On An Exercise Ball | push-ups-with-feet-on-an-exercise-ball \| Push-Ups_With_Feet_On_An_Exercise_Ball | sì | sì | completo |  | fonte=free_exercise_db |
| 711 | Push Press | push-press \| Push_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 712 | Push Press - Behind the Neck | push-press-behind-the-neck \| Push_Press_-_Behind_the_Neck | sì | sì | completo |  | fonte=free_exercise_db |
| 713 | Push Up to Side Plank | push-up-to-side-plank \| Push_Up_to_Side_Plank | sì | sì | completo |  | fonte=free_exercise_db |
| 714 | Pushups | pushups \| Pushups | sì | sì | completo | 11: Push-up [push-up] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 715 | Pushups (Close and Wide Hand Positions) | pushups-close-and-wide-hand-positions \| Pushups_Close_and_Wide_Hand_Positions | sì | sì | completo |  | fonte=free_exercise_db |
| 716 | Pyramid | pyramid \| Pyramid | sì | sì | completo |  | fonte=free_exercise_db |
| 717 | Quad Stretch | quad-stretch \| Quad_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 718 | Quadriceps-SMR | quadriceps-smr \| Quadriceps-SMR | sì | sì | completo |  | fonte=free_exercise_db |
| 719 | Quick Leap | quick-leap \| Quick_Leap | sì | sì | completo |  | fonte=free_exercise_db |
| 720 | Rack Delivery | rack-delivery \| Rack_Delivery | sì | sì | completo |  | fonte=free_exercise_db |
| 721 | Rack Pull with Bands | rack-pull-with-bands \| Rack_Pull_with_Bands | sì | sì | completo |  | fonte=free_exercise_db |
| 722 | Rack Pulls | rack-pulls \| Rack_Pulls | sì | sì | completo |  | fonte=free_exercise_db |
| 723 | Rear Leg Raises | rear-leg-raises \| Rear_Leg_Raises | sì | sì | completo |  | fonte=free_exercise_db |
| 724 | Recumbent Bike | recumbent-bike \| Recumbent_Bike | sì | sì | completo |  | fonte=free_exercise_db |
| 725 | Return Push from Stance | return-push-from-stance \| Return_Push_from_Stance | sì | sì | completo |  | fonte=free_exercise_db |
| 726 | Reverse Band Bench Press | reverse-band-bench-press \| Reverse_Band_Bench_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 727 | Reverse Band Box Squat | reverse-band-box-squat \| Reverse_Band_Box_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 728 | Reverse Band Deadlift | reverse-band-deadlift \| Reverse_Band_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 729 | Reverse Band Power Squat | reverse-band-power-squat \| Reverse_Band_Power_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 730 | Reverse Band Sumo Deadlift | reverse-band-sumo-deadlift \| Reverse_Band_Sumo_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 731 | Reverse Barbell Curl | reverse-barbell-curl \| Reverse_Barbell_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 732 | Reverse Barbell Preacher Curls | reverse-barbell-preacher-curls \| Reverse_Barbell_Preacher_Curls | sì | sì | completo |  | fonte=free_exercise_db |
| 733 | Reverse Cable Curl | reverse-cable-curl \| Reverse_Cable_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 734 | Reverse Flyes | reverse-flyes \| Reverse_Flyes | sì | sì | completo |  | fonte=free_exercise_db |
| 735 | Reverse Flyes With External Rotation | reverse-flyes-with-external-rotation \| Reverse_Flyes_With_External_Rotation | sì | sì | completo |  | fonte=free_exercise_db |
| 736 | Reverse Grip Bent-Over Rows | reverse-grip-bent-over-rows \| Reverse_Grip_Bent-Over_Rows | sì | sì | completo |  | fonte=free_exercise_db |
| 737 | Reverse Grip Triceps Pushdown | reverse-grip-triceps-pushdown \| Reverse_Grip_Triceps_Pushdown | sì | sì | completo |  | fonte=free_exercise_db |
| 738 | Reverse Hyperextension | reverse-hyperextension \| Reverse_Hyperextension | sì | sì | completo |  | fonte=free_exercise_db |
| 739 | Reverse Machine Flyes | reverse-machine-flyes \| Reverse_Machine_Flyes | sì | sì | completo |  | fonte=free_exercise_db |
| 740 | Reverse Plate Curls | reverse-plate-curls \| Reverse_Plate_Curls | sì | sì | completo |  | fonte=free_exercise_db |
| 741 | Reverse Triceps Bench Press | reverse-triceps-bench-press \| Reverse_Triceps_Bench_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 742 | Rhomboids-SMR | rhomboids-smr \| Rhomboids-SMR | sì | sì | completo |  | fonte=free_exercise_db |
| 743 | Rickshaw Carry | rickshaw-carry \| Rickshaw_Carry | sì | sì | completo |  | fonte=free_exercise_db |
| 744 | Rickshaw Deadlift | rickshaw-deadlift \| Rickshaw_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 745 | Ring Dips | ring-dips \| Ring_Dips | sì | sì | completo |  | fonte=free_exercise_db |
| 746 | Rocket Jump | rocket-jump \| Rocket_Jump | sì | sì | completo |  | fonte=free_exercise_db |
| 747 | Rocking Standing Calf Raise | rocking-standing-calf-raise \| Rocking_Standing_Calf_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 748 | Rocky Pull-Ups/Pulldowns | rocky-pull-ups-pulldowns \| Rocky_Pull-Ups_Pulldowns | sì | sì | completo |  | fonte=free_exercise_db |
| 749 | Romanian Deadlift | romanian-deadlift \| Romanian_Deadlift | sì | sì | completo | 91: Romanian deadlift bilanciere [romanian-deadlift-bilanciere] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 750 | Romanian Deadlift from Deficit | romanian-deadlift-from-deficit \| Romanian_Deadlift_from_Deficit | sì | sì | completo |  | fonte=free_exercise_db |
| 751 | Rope Climb | rope-climb \| Rope_Climb | sì | sì | completo |  | fonte=free_exercise_db |
| 752 | Rope Crunch | rope-crunch \| Rope_Crunch | sì | sì | completo |  | fonte=free_exercise_db |
| 753 | Rope Jumping | rope-jumping \| Rope_Jumping | sì | sì | completo |  | fonte=free_exercise_db |
| 754 | Rope Straight-Arm Pulldown | rope-straight-arm-pulldown \| Rope_Straight-Arm_Pulldown | sì | sì | completo |  | fonte=free_exercise_db |
| 755 | Round The World Shoulder Stretch | round-the-world-shoulder-stretch \| Round_The_World_Shoulder_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 756 | Rowing, Stationary | rowing-stationary \| Rowing_Stationary | sì | sì | completo |  | fonte=free_exercise_db |
| 757 | Runner's Stretch | runners-stretch \| Runners_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 758 | Running, Treadmill | running-treadmill \| Running_Treadmill | sì | sì | completo |  | fonte=free_exercise_db |
| 759 | Sandbag Load | sandbag-load \| Sandbag_Load | sì | sì | completo |  | fonte=free_exercise_db |
| 760 | Scissor Kick | scissor-kick \| Scissor_Kick | sì | sì | completo |  | fonte=free_exercise_db |
| 761 | Scissors Jump | scissors-jump \| Scissors_Jump | sì | sì | completo |  | fonte=free_exercise_db |
| 762 | Seated Band Hamstring Curl | seated-band-hamstring-curl \| Seated_Band_Hamstring_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 763 | Seated Barbell Military Press | seated-barbell-military-press \| Seated_Barbell_Military_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 764 | Seated Barbell Twist | seated-barbell-twist \| Seated_Barbell_Twist | sì | sì | completo |  | fonte=free_exercise_db |
| 765 | Seated Bent-Over One-Arm Dumbbell Triceps Extension | seated-bent-over-one-arm-dumbbell-triceps-extension \| Seated_Bent-Over_One-Arm_Dumbbell_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 766 | Seated Bent-Over Rear Delt Raise | seated-bent-over-rear-delt-raise \| Seated_Bent-Over_Rear_Delt_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 767 | Seated Bent-Over Two-Arm Dumbbell Triceps Extension | seated-bent-over-two-arm-dumbbell-triceps-extension \| Seated_Bent-Over_Two-Arm_Dumbbell_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 768 | Seated Biceps | seated-biceps \| Seated_Biceps | sì | sì | completo |  | fonte=free_exercise_db |
| 769 | Seated Cable Rows | seated-cable-rows \| Seated_Cable_Rows | sì | sì | completo |  | fonte=free_exercise_db |
| 770 | Seated Cable Shoulder Press | seated-cable-shoulder-press \| Seated_Cable_Shoulder_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 771 | Seated Calf Stretch | seated-calf-stretch \| Seated_Calf_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 772 | Seated Close-Grip Concentration Barbell Curl | seated-close-grip-concentration-barbell-curl \| Seated_Close-Grip_Concentration_Barbell_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 773 | Seated Dumbbell Curl | seated-dumbbell-curl \| Seated_Dumbbell_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 774 | Seated Dumbbell Inner Biceps Curl | seated-dumbbell-inner-biceps-curl \| Seated_Dumbbell_Inner_Biceps_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 775 | Seated Dumbbell Palms-Down Wrist Curl | seated-dumbbell-palms-down-wrist-curl \| Seated_Dumbbell_Palms-Down_Wrist_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 776 | Seated Dumbbell Palms-Up Wrist Curl | seated-dumbbell-palms-up-wrist-curl \| Seated_Dumbbell_Palms-Up_Wrist_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 777 | Seated Dumbbell Press | seated-dumbbell-press \| Seated_Dumbbell_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 778 | Seated Flat Bench Leg Pull-In | seated-flat-bench-leg-pull-in \| Seated_Flat_Bench_Leg_Pull-In | sì | sì | completo |  | fonte=free_exercise_db |
| 779 | Seated Floor Hamstring Stretch | seated-floor-hamstring-stretch \| Seated_Floor_Hamstring_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 780 | Seated Front Deltoid | seated-front-deltoid \| Seated_Front_Deltoid | sì | sì | completo |  | fonte=free_exercise_db |
| 781 | Seated Glute | seated-glute \| Seated_Glute | sì | sì | completo |  | fonte=free_exercise_db |
| 782 | Seated Good Mornings | seated-good-mornings \| Seated_Good_Mornings | sì | sì | completo |  | fonte=free_exercise_db |
| 783 | Seated Hamstring | seated-hamstring \| Seated_Hamstring | sì | sì | completo |  | fonte=free_exercise_db |
| 784 | Seated Hamstring and Calf Stretch | seated-hamstring-and-calf-stretch \| Seated_Hamstring_and_Calf_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 785 | Seated Head Harness Neck Resistance | seated-head-harness-neck-resistance \| Seated_Head_Harness_Neck_Resistance | sì | sì | completo |  | fonte=free_exercise_db |
| 786 | Seated Leg Curl | seated-leg-curl \| Seated_Leg_Curl | sì | sì | completo | 93: Leg curl seduto [leg-curl-seduto] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 787 | Seated Leg Tucks | seated-leg-tucks \| Seated_Leg_Tucks | sì | sì | completo |  | fonte=free_exercise_db |
| 788 | Seated One-Arm Dumbbell Palms-Down Wrist Curl | seated-one-arm-dumbbell-palms-down-wrist-curl \| Seated_One-Arm_Dumbbell_Palms-Down_Wrist_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 789 | Seated One-Arm Dumbbell Palms-Up Wrist Curl | seated-one-arm-dumbbell-palms-up-wrist-curl \| Seated_One-Arm_Dumbbell_Palms-Up_Wrist_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 790 | Seated One-arm Cable Pulley Rows | seated-one-arm-cable-pulley-rows \| Seated_One-arm_Cable_Pulley_Rows | sì | sì | completo |  | fonte=free_exercise_db |
| 791 | Seated Overhead Stretch | seated-overhead-stretch \| Seated_Overhead_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 792 | Seated Palm-Up Barbell Wrist Curl | seated-palm-up-barbell-wrist-curl \| Seated_Palm-Up_Barbell_Wrist_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 793 | Seated Palms-Down Barbell Wrist Curl | seated-palms-down-barbell-wrist-curl \| Seated_Palms-Down_Barbell_Wrist_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 794 | Seated Side Lateral Raise | seated-side-lateral-raise \| Seated_Side_Lateral_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 795 | Seated Triceps Press | seated-triceps-press \| Seated_Triceps_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 796 | Seated Two-Arm Palms-Up Low-Pulley Wrist Curl | seated-two-arm-palms-up-low-pulley-wrist-curl \| Seated_Two-Arm_Palms-Up_Low-Pulley_Wrist_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 797 | See-Saw Press (Alternating Side Press) | see-saw-press-alternating-side-press \| See-Saw_Press_Alternating_Side_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 798 | Shotgun Row | shotgun-row \| Shotgun_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 799 | Shoulder Circles | shoulder-circles \| Shoulder_Circles | sì | sì | completo |  | fonte=free_exercise_db |
| 800 | Shoulder Press - With Bands | shoulder-press-with-bands \| Shoulder_Press_-_With_Bands | sì | sì | completo |  | fonte=free_exercise_db |
| 801 | Shoulder Raise | shoulder-raise \| Shoulder_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 802 | Shoulder Stretch | shoulder-stretch \| Shoulder_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 803 | Side-Lying Floor Stretch | side-lying-floor-stretch \| Side-Lying_Floor_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 804 | Side Bridge | side-bridge \| Side_Bridge | sì | sì | completo |  | fonte=free_exercise_db |
| 805 | Side Hop-Sprint | side-hop-sprint \| Side_Hop-Sprint | sì | sì | completo |  | fonte=free_exercise_db |
| 806 | Side Jackknife | side-jackknife \| Side_Jackknife | sì | sì | completo |  | fonte=free_exercise_db |
| 807 | Side Lateral Raise | side-lateral-raise \| Side_Lateral_Raise | sì | sì | completo | 16: Alzate laterali manubri [alzate-laterali] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 808 | Side Laterals to Front Raise | side-laterals-to-front-raise \| Side_Laterals_to_Front_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 809 | Side Leg Raises | side-leg-raises \| Side_Leg_Raises | sì | sì | completo |  | fonte=free_exercise_db |
| 810 | Side Lying Groin Stretch | side-lying-groin-stretch \| Side_Lying_Groin_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 811 | Side Neck Stretch | side-neck-stretch \| Side_Neck_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 812 | Side Standing Long Jump | side-standing-long-jump \| Side_Standing_Long_Jump | sì | sì | completo |  | fonte=free_exercise_db |
| 813 | Side To Side Chins | side-to-side-chins \| Side_To_Side_Chins | sì | sì | completo |  | fonte=free_exercise_db |
| 814 | Side Wrist Pull | side-wrist-pull \| Side_Wrist_Pull | sì | sì | completo |  | fonte=free_exercise_db |
| 815 | Side to Side Box Shuffle | side-to-side-box-shuffle \| Side_to_Side_Box_Shuffle | sì | sì | completo |  | fonte=free_exercise_db |
| 816 | Single-Arm Cable Crossover | single-arm-cable-crossover \| Single-Arm_Cable_Crossover | sì | sì | completo |  | fonte=free_exercise_db |
| 817 | Single-Arm Linear Jammer | single-arm-linear-jammer \| Single-Arm_Linear_Jammer | sì | sì | completo |  | fonte=free_exercise_db |
| 818 | Single-Arm Push-Up | single-arm-push-up \| Single-Arm_Push-Up | sì | sì | completo |  | fonte=free_exercise_db |
| 819 | Single-Cone Sprint Drill | single-cone-sprint-drill \| Single-Cone_Sprint_Drill | sì | sì | completo |  | fonte=free_exercise_db |
| 820 | Single-Leg High Box Squat | single-leg-high-box-squat \| Single-Leg_High_Box_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 821 | Single-Leg Hop Progression | single-leg-hop-progression \| Single-Leg_Hop_Progression | sì | sì | completo |  | fonte=free_exercise_db |
| 822 | Single-Leg Lateral Hop | single-leg-lateral-hop \| Single-Leg_Lateral_Hop | sì | sì | completo |  | fonte=free_exercise_db |
| 823 | Single-Leg Leg Extension | single-leg-leg-extension \| Single-Leg_Leg_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 824 | Single-Leg Stride Jump | single-leg-stride-jump \| Single-Leg_Stride_Jump | sì | sì | completo |  | fonte=free_exercise_db |
| 825 | Single Dumbbell Raise | single-dumbbell-raise \| Single_Dumbbell_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 826 | Single Leg Butt Kick | single-leg-butt-kick \| Single_Leg_Butt_Kick | sì | sì | completo |  | fonte=free_exercise_db |
| 827 | Single Leg Push-off | single-leg-push-off \| Single_Leg_Push-off | sì | sì | completo |  | fonte=free_exercise_db |
| 828 | Sit-Up | sit-up \| Sit-Up | sì | sì | completo | 162: 3/4 Sit-Up [3-4-sit-up] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 829 | Sit Squats | sit-squats \| Sit_Squats | sì | sì | completo |  | fonte=free_exercise_db |
| 830 | Skating | skating \| Skating | sì | sì | completo |  | fonte=free_exercise_db |
| 831 | Sled Drag - Harness | sled-drag-harness \| Sled_Drag_-_Harness | sì | sì | completo |  | fonte=free_exercise_db |
| 832 | Sled Overhead Backward Walk | sled-overhead-backward-walk \| Sled_Overhead_Backward_Walk | sì | sì | completo |  | fonte=free_exercise_db |
| 833 | Sled Overhead Triceps Extension | sled-overhead-triceps-extension \| Sled_Overhead_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 834 | Sled Reverse Flye | sled-reverse-flye \| Sled_Reverse_Flye | sì | sì | completo |  | fonte=free_exercise_db |
| 835 | Sled Row | sled-row \| Sled_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 836 | Sledgehammer Swings | sledgehammer-swings \| Sledgehammer_Swings | sì | sì | completo |  | fonte=free_exercise_db |
| 837 | Smith Incline Shoulder Raise | smith-incline-shoulder-raise \| Smith_Incline_Shoulder_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 838 | Smith Machine Behind the Back Shrug | smith-machine-behind-the-back-shrug \| Smith_Machine_Behind_the_Back_Shrug | sì | sì | completo |  | fonte=free_exercise_db |
| 839 | Smith Machine Bench Press | smith-machine-bench-press \| Smith_Machine_Bench_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 840 | Smith Machine Bent Over Row | smith-machine-bent-over-row \| Smith_Machine_Bent_Over_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 841 | Smith Machine Calf Raise | smith-machine-calf-raise \| Smith_Machine_Calf_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 842 | Smith Machine Close-Grip Bench Press | smith-machine-close-grip-bench-press \| Smith_Machine_Close-Grip_Bench_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 843 | Smith Machine Decline Press | smith-machine-decline-press \| Smith_Machine_Decline_Press | sì | sì | completo | 361: Decline Smith Press [decline-smith-press] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 844 | Smith Machine Hang Power Clean | smith-machine-hang-power-clean \| Smith_Machine_Hang_Power_Clean | sì | sì | completo |  | fonte=free_exercise_db |
| 845 | Smith Machine Hip Raise | smith-machine-hip-raise \| Smith_Machine_Hip_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 846 | Smith Machine Incline Bench Press | smith-machine-incline-bench-press \| Smith_Machine_Incline_Bench_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 847 | Smith Machine Leg Press | smith-machine-leg-press \| Smith_Machine_Leg_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 848 | Smith Machine One-Arm Upright Row | smith-machine-one-arm-upright-row \| Smith_Machine_One-Arm_Upright_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 849 | Smith Machine Overhead Shoulder Press | smith-machine-overhead-shoulder-press \| Smith_Machine_Overhead_Shoulder_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 850 | Smith Machine Pistol Squat | smith-machine-pistol-squat \| Smith_Machine_Pistol_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 851 | Smith Machine Reverse Calf Raises | smith-machine-reverse-calf-raises \| Smith_Machine_Reverse_Calf_Raises | sì | sì | completo |  | fonte=free_exercise_db |
| 852 | Smith Machine Stiff-Legged Deadlift | smith-machine-stiff-legged-deadlift \| Smith_Machine_Stiff-Legged_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 853 | Smith Machine Upright Row | smith-machine-upright-row \| Smith_Machine_Upright_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 854 | Smith Single-Leg Split Squat | smith-single-leg-split-squat \| Smith_Single-Leg_Split_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 855 | Snatch | snatch \| Snatch | sì | sì | completo |  | fonte=free_exercise_db |
| 856 | Snatch Balance | snatch-balance \| Snatch_Balance | sì | sì | completo |  | fonte=free_exercise_db |
| 857 | Snatch Deadlift | snatch-deadlift \| Snatch_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 858 | Snatch Pull | snatch-pull \| Snatch_Pull | sì | sì | completo |  | fonte=free_exercise_db |
| 859 | Snatch Shrug | snatch-shrug \| Snatch_Shrug | sì | sì | completo |  | fonte=free_exercise_db |
| 860 | Snatch from Blocks | snatch-from-blocks \| Snatch_from_Blocks | sì | sì | completo |  | fonte=free_exercise_db |
| 861 | Speed Band Overhead Triceps | speed-band-overhead-triceps \| Speed_Band_Overhead_Triceps | sì | sì | completo |  | fonte=free_exercise_db |
| 862 | Speed Box Squat | speed-box-squat \| Speed_Box_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 863 | Speed Squats | speed-squats \| Speed_Squats | sì | sì | completo |  | fonte=free_exercise_db |
| 864 | Spell Caster | spell-caster \| Spell_Caster | sì | sì | completo |  | fonte=free_exercise_db |
| 865 | Spider Crawl | spider-crawl \| Spider_Crawl | sì | sì | completo |  | fonte=free_exercise_db |
| 866 | Spider Curl | spider-curl \| Spider_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 867 | Spinal Stretch | spinal-stretch \| Spinal_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 868 | Split Clean | split-clean \| Split_Clean | sì | sì | completo |  | fonte=free_exercise_db |
| 869 | Split Jerk | split-jerk \| Split_Jerk | sì | sì | completo |  | fonte=free_exercise_db |
| 870 | Split Jump | split-jump \| Split_Jump | sì | sì | completo |  | fonte=free_exercise_db |
| 871 | Split Snatch | split-snatch \| Split_Snatch | sì | sì | completo |  | fonte=free_exercise_db |
| 872 | Split Squat with Dumbbells | split-squat-with-dumbbells \| Split_Squat_with_Dumbbells | sì | sì | completo |  | fonte=free_exercise_db |
| 873 | Split Squats | split-squats \| Split_Squats | sì | sì | completo |  | fonte=free_exercise_db |
| 874 | Squat Jerk | squat-jerk \| Squat_Jerk | sì | sì | completo |  | fonte=free_exercise_db |
| 875 | Squat with Bands | squat-with-bands \| Squat_with_Bands | sì | sì | completo |  | fonte=free_exercise_db |
| 876 | Squat with Chains | squat-with-chains \| Squat_with_Chains | sì | sì | completo |  | fonte=free_exercise_db |
| 877 | Squat with Plate Movers | squat-with-plate-movers \| Squat_with_Plate_Movers | sì | sì | completo |  | fonte=free_exercise_db |
| 878 | Squats - With Bands | squats-with-bands \| Squats_-_With_Bands | sì | sì | completo |  | fonte=free_exercise_db |
| 879 | Stairmaster | stairmaster \| Stairmaster | sì | sì | completo |  | fonte=free_exercise_db |
| 880 | Standing Alternating Dumbbell Press | standing-alternating-dumbbell-press \| Standing_Alternating_Dumbbell_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 881 | Standing Barbell Calf Raise | standing-barbell-calf-raise \| Standing_Barbell_Calf_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 882 | Standing Barbell Press Behind Neck | standing-barbell-press-behind-neck \| Standing_Barbell_Press_Behind_Neck | sì | sì | completo |  | fonte=free_exercise_db |
| 883 | Standing Bent-Over One-Arm Dumbbell Triceps Extension | standing-bent-over-one-arm-dumbbell-triceps-extension \| Standing_Bent-Over_One-Arm_Dumbbell_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 884 | Standing Bent-Over Two-Arm Dumbbell Triceps Extension | standing-bent-over-two-arm-dumbbell-triceps-extension \| Standing_Bent-Over_Two-Arm_Dumbbell_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 885 | Standing Biceps Cable Curl | standing-biceps-cable-curl \| Standing_Biceps_Cable_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 886 | Standing Biceps Stretch | standing-biceps-stretch \| Standing_Biceps_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 887 | Standing Bradford Press | standing-bradford-press \| Standing_Bradford_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 888 | Standing Cable Chest Press | standing-cable-chest-press \| Standing_Cable_Chest_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 889 | Standing Cable Lift | standing-cable-lift \| Standing_Cable_Lift | sì | sì | completo |  | fonte=free_exercise_db |
| 890 | Standing Cable Wood Chop | standing-cable-wood-chop \| Standing_Cable_Wood_Chop | sì | sì | completo |  | fonte=free_exercise_db |
| 891 | Standing Calf Raises | standing-calf-raises \| Standing_Calf_Raises | sì | sì | completo | 106: Standing calf raise macchina [standing-calf-raise-machine] (canonical_tokens,same_primary,same_equipment,same_category) | fonte=free_exercise_db |
| 892 | Standing Concentration Curl | standing-concentration-curl \| Standing_Concentration_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 893 | Standing Dumbbell Calf Raise | standing-dumbbell-calf-raise \| Standing_Dumbbell_Calf_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 894 | Standing Dumbbell Press | standing-dumbbell-press \| Standing_Dumbbell_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 895 | Standing Dumbbell Reverse Curl | standing-dumbbell-reverse-curl \| Standing_Dumbbell_Reverse_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 896 | Standing Dumbbell Straight-Arm Front Delt Raise Above Head | standing-dumbbell-straight-arm-front-delt-raise-above-head \| Standing_Dumbbell_Straight-Arm_Front_Delt_Raise_Above_Head | sì | sì | completo |  | fonte=free_exercise_db |
| 897 | Standing Dumbbell Triceps Extension | standing-dumbbell-triceps-extension \| Standing_Dumbbell_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 898 | Standing Dumbbell Upright Row | standing-dumbbell-upright-row \| Standing_Dumbbell_Upright_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 899 | Standing Elevated Quad Stretch | standing-elevated-quad-stretch \| Standing_Elevated_Quad_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 900 | Standing Front Barbell Raise Over Head | standing-front-barbell-raise-over-head \| Standing_Front_Barbell_Raise_Over_Head | sì | sì | completo |  | fonte=free_exercise_db |
| 901 | Standing Gastrocnemius Calf Stretch | standing-gastrocnemius-calf-stretch \| Standing_Gastrocnemius_Calf_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 902 | Standing Hamstring and Calf Stretch | standing-hamstring-and-calf-stretch \| Standing_Hamstring_and_Calf_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 903 | Standing Hip Circles | standing-hip-circles \| Standing_Hip_Circles | sì | sì | completo |  | fonte=free_exercise_db |
| 904 | Standing Hip Flexors | standing-hip-flexors \| Standing_Hip_Flexors | sì | sì | completo |  | fonte=free_exercise_db |
| 905 | Standing Inner-Biceps Curl | standing-inner-biceps-curl \| Standing_Inner-Biceps_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 906 | Standing Lateral Stretch | standing-lateral-stretch \| Standing_Lateral_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 907 | Standing Leg Curl | standing-leg-curl \| Standing_Leg_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 908 | Standing Long Jump | standing-long-jump \| Standing_Long_Jump | sì | sì | completo |  | fonte=free_exercise_db |
| 909 | Standing Low-Pulley Deltoid Raise | standing-low-pulley-deltoid-raise \| Standing_Low-Pulley_Deltoid_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 910 | Standing Low-Pulley One-Arm Triceps Extension | standing-low-pulley-one-arm-triceps-extension \| Standing_Low-Pulley_One-Arm_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 911 | Standing Military Press | standing-military-press \| Standing_Military_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 912 | Standing Olympic Plate Hand Squeeze | standing-olympic-plate-hand-squeeze \| Standing_Olympic_Plate_Hand_Squeeze | sì | sì | completo |  | fonte=free_exercise_db |
| 913 | Standing One-Arm Cable Curl | standing-one-arm-cable-curl \| Standing_One-Arm_Cable_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 914 | Standing One-Arm Dumbbell Curl Over Incline Bench | standing-one-arm-dumbbell-curl-over-incline-bench \| Standing_One-Arm_Dumbbell_Curl_Over_Incline_Bench | sì | sì | completo |  | fonte=free_exercise_db |
| 915 | Standing One-Arm Dumbbell Triceps Extension | standing-one-arm-dumbbell-triceps-extension \| Standing_One-Arm_Dumbbell_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 916 | Standing Overhead Barbell Triceps Extension | standing-overhead-barbell-triceps-extension \| Standing_Overhead_Barbell_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 917 | Standing Palm-In One-Arm Dumbbell Press | standing-palm-in-one-arm-dumbbell-press \| Standing_Palm-In_One-Arm_Dumbbell_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 918 | Standing Palms-In Dumbbell Press | standing-palms-in-dumbbell-press \| Standing_Palms-In_Dumbbell_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 919 | Standing Palms-Up Barbell Behind The Back Wrist Curl | standing-palms-up-barbell-behind-the-back-wrist-curl \| Standing_Palms-Up_Barbell_Behind_The_Back_Wrist_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 920 | Standing Pelvic Tilt | standing-pelvic-tilt \| Standing_Pelvic_Tilt | sì | sì | completo |  | fonte=free_exercise_db |
| 921 | Standing Rope Crunch | standing-rope-crunch \| Standing_Rope_Crunch | sì | sì | completo |  | fonte=free_exercise_db |
| 922 | Standing Soleus And Achilles Stretch | standing-soleus-and-achilles-stretch \| Standing_Soleus_And_Achilles_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 923 | Standing Toe Touches | standing-toe-touches \| Standing_Toe_Touches | sì | sì | completo |  | fonte=free_exercise_db |
| 924 | Standing Towel Triceps Extension | standing-towel-triceps-extension \| Standing_Towel_Triceps_Extension | sì | sì | completo |  | fonte=free_exercise_db |
| 925 | Standing Two-Arm Overhead Throw | standing-two-arm-overhead-throw \| Standing_Two-Arm_Overhead_Throw | sì | sì | completo |  | fonte=free_exercise_db |
| 926 | Star Jump | star-jump \| Star_Jump | sì | sì | completo |  | fonte=free_exercise_db |
| 927 | Step-up with Knee Raise | step-up-with-knee-raise \| Step-up_with_Knee_Raise | sì | sì | completo |  | fonte=free_exercise_db |
| 928 | Step Mill | step-mill \| Step_Mill | sì | sì | completo |  | fonte=free_exercise_db |
| 929 | Stiff-Legged Barbell Deadlift | stiff-legged-barbell-deadlift \| Stiff-Legged_Barbell_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 930 | Stiff-Legged Dumbbell Deadlift | stiff-legged-dumbbell-deadlift \| Stiff-Legged_Dumbbell_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 931 | Stiff Leg Barbell Good Morning | stiff-leg-barbell-good-morning \| Stiff_Leg_Barbell_Good_Morning | sì | sì | completo |  | fonte=free_exercise_db |
| 932 | Stomach Vacuum | stomach-vacuum \| Stomach_Vacuum | sì | sì | completo |  | fonte=free_exercise_db |
| 933 | Straight-Arm Dumbbell Pullover | straight-arm-dumbbell-pullover \| Straight-Arm_Dumbbell_Pullover | sì | sì | completo |  | fonte=free_exercise_db |
| 934 | Straight-Arm Pulldown | straight-arm-pulldown \| Straight-Arm_Pulldown | sì | sì | completo |  | fonte=free_exercise_db |
| 935 | Straight Bar Bench Mid Rows | straight-bar-bench-mid-rows \| Straight_Bar_Bench_Mid_Rows | sì | sì | completo |  | fonte=free_exercise_db |
| 936 | Straight Raises on Incline Bench | straight-raises-on-incline-bench \| Straight_Raises_on_Incline_Bench | sì | sì | completo |  | fonte=free_exercise_db |
| 937 | Stride Jump Crossover | stride-jump-crossover \| Stride_Jump_Crossover | sì | sì | completo |  | fonte=free_exercise_db |
| 938 | Sumo Deadlift | sumo-deadlift \| Sumo_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 939 | Sumo Deadlift with Bands | sumo-deadlift-with-bands \| Sumo_Deadlift_with_Bands | sì | sì | completo |  | fonte=free_exercise_db |
| 940 | Sumo Deadlift with Chains | sumo-deadlift-with-chains \| Sumo_Deadlift_with_Chains | sì | sì | completo |  | fonte=free_exercise_db |
| 941 | Superman | superman \| Superman | sì | sì | completo |  | fonte=free_exercise_db |
| 942 | Supine Chest Throw | supine-chest-throw \| Supine_Chest_Throw | sì | sì | completo |  | fonte=free_exercise_db |
| 943 | Supine One-Arm Overhead Throw | supine-one-arm-overhead-throw \| Supine_One-Arm_Overhead_Throw | sì | sì | completo |  | fonte=free_exercise_db |
| 944 | Supine Two-Arm Overhead Throw | supine-two-arm-overhead-throw \| Supine_Two-Arm_Overhead_Throw | sì | sì | completo |  | fonte=free_exercise_db |
| 945 | Suspended Fallout | suspended-fallout \| Suspended_Fallout | sì | sì | completo |  | fonte=free_exercise_db |
| 946 | Suspended Push-Up | suspended-push-up \| Suspended_Push-Up | sì | sì | completo |  | fonte=free_exercise_db |
| 947 | Suspended Reverse Crunch | suspended-reverse-crunch \| Suspended_Reverse_Crunch | sì | sì | completo |  | fonte=free_exercise_db |
| 948 | Suspended Row | suspended-row \| Suspended_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 949 | Suspended Split Squat | suspended-split-squat \| Suspended_Split_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 950 | Svend Press | svend-press \| Svend_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 951 | T-Bar Row with Handle | t-bar-row-with-handle \| T-Bar_Row_with_Handle | sì | sì | completo |  | fonte=free_exercise_db |
| 952 | Tate Press | tate-press \| Tate_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 953 | The Straddle | the-straddle \| The_Straddle | sì | sì | completo |  | fonte=free_exercise_db |
| 954 | Thigh Abductor | thigh-abductor \| Thigh_Abductor | sì | sì | completo |  | fonte=free_exercise_db |
| 955 | Thigh Adductor | thigh-adductor \| Thigh_Adductor | sì | sì | completo |  | fonte=free_exercise_db |
| 956 | Tire Flip | tire-flip \| Tire_Flip | sì | sì | completo |  | fonte=free_exercise_db |
| 957 | Toe Touchers | toe-touchers \| Toe_Touchers | sì | sì | completo |  | fonte=free_exercise_db |
| 958 | Torso Rotation | torso-rotation \| Torso_Rotation | sì | sì | completo |  | fonte=free_exercise_db |
| 959 | Trail Running/Walking | trail-running-walking \| Trail_Running_Walking | sì | sì | completo |  | fonte=free_exercise_db |
| 960 | Trap Bar Deadlift | trap-bar-deadlift \| Trap_Bar_Deadlift | sì | sì | completo |  | fonte=free_exercise_db |
| 961 | Tricep Dumbbell Kickback | tricep-dumbbell-kickback \| Tricep_Dumbbell_Kickback | sì | sì | completo |  | fonte=free_exercise_db |
| 962 | Tricep Side Stretch | tricep-side-stretch \| Tricep_Side_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 963 | Triceps Overhead Extension with Rope | triceps-overhead-extension-with-rope \| Triceps_Overhead_Extension_with_Rope | sì | sì | completo |  | fonte=free_exercise_db |
| 964 | Triceps Pushdown - Rope Attachment | triceps-pushdown-rope-attachment \| Triceps_Pushdown_-_Rope_Attachment | sì | sì | completo |  | fonte=free_exercise_db |
| 965 | Triceps Pushdown - V-Bar Attachment | triceps-pushdown-v-bar-attachment \| Triceps_Pushdown_-_V-Bar_Attachment | sì | sì | completo |  | fonte=free_exercise_db |
| 966 | Triceps Stretch | triceps-stretch \| Triceps_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 967 | Tuck Crunch | tuck-crunch \| Tuck_Crunch | sì | sì | completo |  | fonte=free_exercise_db |
| 968 | Two-Arm Dumbbell Preacher Curl | two-arm-dumbbell-preacher-curl \| Two-Arm_Dumbbell_Preacher_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 969 | Two-Arm Kettlebell Clean | two-arm-kettlebell-clean \| Two-Arm_Kettlebell_Clean | sì | sì | completo |  | fonte=free_exercise_db |
| 970 | Two-Arm Kettlebell Jerk | two-arm-kettlebell-jerk \| Two-Arm_Kettlebell_Jerk | sì | sì | completo |  | fonte=free_exercise_db |
| 971 | Two-Arm Kettlebell Military Press | two-arm-kettlebell-military-press \| Two-Arm_Kettlebell_Military_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 972 | Two-Arm Kettlebell Row | two-arm-kettlebell-row \| Two-Arm_Kettlebell_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 973 | Underhand Cable Pulldowns | underhand-cable-pulldowns \| Underhand_Cable_Pulldowns | sì | sì | completo |  | fonte=free_exercise_db |
| 974 | Upper Back-Leg Grab | upper-back-leg-grab \| Upper_Back-Leg_Grab | sì | sì | completo |  | fonte=free_exercise_db |
| 975 | Upper Back Stretch | upper-back-stretch \| Upper_Back_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 976 | Upright Barbell Row | upright-barbell-row \| Upright_Barbell_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 977 | Upright Cable Row | upright-cable-row \| Upright_Cable_Row | sì | sì | completo |  | fonte=free_exercise_db |
| 978 | Upright Row - With Bands | upright-row-with-bands \| Upright_Row_-_With_Bands | sì | sì | completo |  | fonte=free_exercise_db |
| 979 | Upward Stretch | upward-stretch \| Upward_Stretch | sì | sì | completo |  | fonte=free_exercise_db |
| 980 | V-Bar Pulldown | v-bar-pulldown \| V-Bar_Pulldown | sì | sì | completo |  | fonte=free_exercise_db |
| 981 | V-Bar Pullup | v-bar-pullup \| V-Bar_Pullup | sì | sì | completo |  | fonte=free_exercise_db |
| 982 | Vertical Swing | vertical-swing \| Vertical_Swing | sì | sì | completo |  | fonte=free_exercise_db |
| 983 | Walking, Treadmill | walking-treadmill \| Walking_Treadmill | sì | sì | completo |  | fonte=free_exercise_db |
| 984 | Weighted Ball Hyperextension | weighted-ball-hyperextension \| Weighted_Ball_Hyperextension | sì | sì | completo |  | fonte=free_exercise_db |
| 985 | Weighted Ball Side Bend | weighted-ball-side-bend \| Weighted_Ball_Side_Bend | sì | sì | completo |  | fonte=free_exercise_db |
| 986 | Weighted Bench Dip | weighted-bench-dip \| Weighted_Bench_Dip | sì | sì | completo |  | fonte=free_exercise_db |
| 987 | Weighted Crunches | weighted-crunches \| Weighted_Crunches | sì | sì | completo |  | fonte=free_exercise_db |
| 988 | Weighted Jump Squat | weighted-jump-squat \| Weighted_Jump_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 989 | Weighted Pull Ups | weighted-pull-ups \| Weighted_Pull_Ups | sì | sì | completo |  | fonte=free_exercise_db |
| 990 | Weighted Sissy Squat | weighted-sissy-squat \| Weighted_Sissy_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 991 | Weighted Sit-Ups - With Bands | weighted-sit-ups-with-bands \| Weighted_Sit-Ups_-_With_Bands | sì | sì | completo |  | fonte=free_exercise_db |
| 992 | Weighted Squat | weighted-squat \| Weighted_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 993 | Wide-Grip Barbell Bench Press | wide-grip-barbell-bench-press \| Wide-Grip_Barbell_Bench_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 994 | Wide-Grip Decline Barbell Bench Press | wide-grip-decline-barbell-bench-press \| Wide-Grip_Decline_Barbell_Bench_Press | sì | sì | completo |  | fonte=free_exercise_db |
| 995 | Wide-Grip Decline Barbell Pullover | wide-grip-decline-barbell-pullover \| Wide-Grip_Decline_Barbell_Pullover | sì | sì | completo |  | fonte=free_exercise_db |
| 996 | Wide-Grip Lat Pulldown | wide-grip-lat-pulldown \| Wide-Grip_Lat_Pulldown | sì | sì | completo |  | fonte=free_exercise_db |
| 997 | Wide-Grip Pulldown Behind The Neck | wide-grip-pulldown-behind-the-neck \| Wide-Grip_Pulldown_Behind_The_Neck | sì | sì | completo |  | fonte=free_exercise_db |
| 998 | Wide-Grip Rear Pull-Up | wide-grip-rear-pull-up \| Wide-Grip_Rear_Pull-Up | sì | sì | completo |  | fonte=free_exercise_db |
| 999 | Wide-Grip Standing Barbell Curl | wide-grip-standing-barbell-curl \| Wide-Grip_Standing_Barbell_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 1000 | Wide Stance Barbell Squat | wide-stance-barbell-squat \| Wide_Stance_Barbell_Squat | sì | sì | completo |  | fonte=free_exercise_db |
| 1001 | Wide Stance Stiff Legs | wide-stance-stiff-legs \| Wide_Stance_Stiff_Legs | sì | sì | completo |  | fonte=free_exercise_db |
| 1002 | Wind Sprints | wind-sprints \| Wind_Sprints | sì | sì | completo |  | fonte=free_exercise_db |
| 1003 | Windmills | windmills \| Windmills | sì | sì | completo |  | fonte=free_exercise_db |
| 1004 | Wrist Circles | wrist-circles \| Wrist_Circles | sì | sì | completo |  | fonte=free_exercise_db |
| 1005 | Wrist Roller | wrist-roller \| Wrist_Roller | sì | sì | completo |  | fonte=free_exercise_db |
| 1006 | Wrist Rotations with Straight Bar | wrist-rotations-with-straight-bar \| Wrist_Rotations_with_Straight_Bar | sì | sì | completo |  | fonte=free_exercise_db |
| 1007 | Yoke Walk | yoke-walk \| Yoke_Walk | sì | sì | completo |  | fonte=free_exercise_db |
| 1008 | Zercher Squats | zercher-squats \| Zercher_Squats | sì | sì | completo |  | fonte=free_exercise_db |
| 1009 | Zottman Curl | zottman-curl \| Zottman_Curl | sì | sì | completo |  | fonte=free_exercise_db |
| 1010 | Zottman Preacher Curl | zottman-preacher-curl \| Zottman_Preacher_Curl | sì | sì | completo |  | fonte=free_exercise_db |
