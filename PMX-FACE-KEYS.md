# MightyStar — PMX / BPMX Facial Morph Keys

**Extracted: 19 October 2026.** Actual model data from the companion’s local character cache; no remote models were downloaded.

**Coverage:** 50 models (48 PMX, 2 BPMX), 4,789 total morph entries, 3,419 entries explicitly categorized as Eyebrow/Eye/Lip, and 625 distinct original names in those three facial categories. All 50 files parsed successfully.

“Face keys” here means named morph controls/blend shapes, not skeletal bones or animation keyframes. Exact original names, optional English names, zero-based indices, categories and morph types are preserved. The app matches the original `name`, not the English-name field.

## Scope and how to use this file

- Section 1 lists the app’s 11 supported face channels and aliases. These are a small subset of the controls actually stored in the models.
- Section 2 indexes every locally cached model, including variants. A model name alone may identify several different files.
- Section 3 is a combined index of exact facial key names from the explicit Eyebrow/Eye/Lip categories.
- Section 4 contains every morph from every model, including Other/System, so potentially facial controls placed in those categories are not omitted. Other/System entries may instead control outfits, materials or accessories; their visual purpose has not been tested.
- Catalog entries without a local PMX/BPMX binary are outside this extraction. Workspace stage/environment PMX files and GLB characters such as Hailey are excluded.
- Where catalog or cache metadata identifies the model path, it is included. Otherwise the embedded model name and cache filename identify the file; no path has been guessed.
- English names are supplied by the model author and are not new translations. A blank English name appears as —. Indices are local to each model and must not be reused across models.

## 1. Face channels currently recognized by the app

Source: `Mighty Chat/Renderer/face/FaceRigAdapter.ts`. Normalization ignores case, spaces, underscores, dots and hyphens. The first exact normalized original-name match wins. Nonvowel channels also allow substring matching for normalized aliases at least five characters long. The per-model mappings below reproduce this lookup against the parsed morph order; they are static predictions, not rendered calibration results.

| App channel | Recognized aliases | Current use |
|---|---|---|
| a | `あ`, `moutha`, `vrc.v_aa`, `aa`, `a` | Mouth vowel |
| i | `い`, `mouthi`, `vrc.v_ih`, `ih`, `i` | Mouth vowel; also approximate fv |
| u | `う`, `mouthu`, `vrc.v_ou`, `ou`, `u` | Mouth vowel |
| e | `え`, `mouthe`, `vrc.v_e`, `e` | Mouth vowel |
| o | `お`, `moutho`, `vrc.v_oh`, `oh`, `o` | Mouth vowel (supported; current Edge spelling mapper maps o letters to u) |
| blink | `まばたき`, `両目閉じ`, `blink`, `eyesclose`, `eyeclose` | Automatic blinking |
| smileEyes | `笑い`, `笑顔`, `eyesmile`, `happyeye`, `smileeye` | Happy/amused eyes |
| smile | `にやり`, `微笑み`, `mouthsmile`, `smile` | Happy/amused mouth; reduced while speaking |
| sad | `困る`, `悲しい`, `sad`, `troubled`, `worry` | Sad/concerned expression |
| angry | `怒り`, `angry`, `mad` | Recognized, but current ExpressionController targets zero |
| surprised | `びっくり`, `驚き`, `surprised`, `surprise` | Surprised expression |

Mouth cue labels `rest`, `closed`, `a`, `i`, `u`, `e`, `o`, `fv` are animation-controller labels. They are not eight guaranteed morph names in each model. `closed`/`rest` zero the controlled vowel weights; `fv` approximates an i weight. Morph weights are clamped to 0–1. A recognized key is not proof that it has the ideal visual shape for that channel.

Production face blending is attached only to a usable MMD runtime model. Models using the skeleton-only fallback do not get this face adapter. Live calls currently supply neutral mood; ordinary Edge chat speech can carry the generated mood.

## 2. Cached model index

Counts labeled Face include author-categorized Eyebrow/Eye/Lip entries. Total includes every category.

| ID | Model | Format | Face | Total | Source asset path |
|---|---|---|---:|---:|---|
| 01 | [Aalto](#model-01) | PMX | 84 | 105 | `ww/chars/Aalto/Aalto.pmx` |
| 02 | [Akane](#model-02) | PMX | 36 | 41 | `nte/chars/Akane Rin/Akane Rin_old/Akane Rin.pmx` |
| 03 | [Alice Thymefield](#model-03) | PMX | 40 | 40 | `zzz/chars/Alice Thymefield/Alice_skin/Alice.pmx` |
| 04 | [Amber](#model-04) | PMX | 48 | 49 | `gi/chars/Amber/Amber/安柏.pmx` |
| 05 | [Barbara](#model-05) | PMX | 60 | 61 | `gi/chars/Barbara/Barbara/芭芭拉.pmx` |
| 06 | [Bennett](#model-06) | PMX | 60 | 60 | `gi/chars/Bennett/Bennett/班尼特.pmx` |
| 07 | [Blackbird](#model-07) | PMX | 111 | 132 | `nte/chars/Blackbird/Blackbird.pmx` |
| 08 | [Brant](#model-08) | BPMX | 92 | 161 | `ww/chars/Brant/Brant.bpmx` |
| 09 | [Cantarella](#model-09) | PMX | 65 | 69 | `ww/chars/Cantarella/Cantarella.pmx` |
| 10 | [Carlotta](#model-10) | PMX | 87 | 116 | `ww/chars/Carlotta/Carlotta/Carlotta.pmx` |
| 11 | [Carlotta](#model-11) | PMX | 87 | 118 | `ww/chars/Carlotta/Carlotta_skin/Carlotta.pmx` |
| 12 | [Carlotta](#model-12) | PMX | 96 | 164 | `ww/chars/Carlotta/DarkCarlotta/Carlotta.pmx` |
| 13 | [Carole Arna](#model-13) | PMX | 0 | 30 | `zzz/chars/Carole Arna/Carole Arna.pmx` |
| 14 | [Cartethyia](#model-14) | PMX | 91 | 121 | `ww/chars/Cartethyia/Fleurdelys/Fleurdelys.pmx` |
| 15 | [Changli](#model-15) | PMX | 98 | 118 | `ww/chars/Changli/Changli/Changli.pmx` |
| 16 | [Danjin](#model-16) | PMX | 81 | 113 | `ww/chars/Danjin/Danjin.pmx` |
| 17 | [Encore](#model-17) | PMX | 81 | 112 | `ww/chars/Encore/Encore.pmx` |
| 18 | [Evelyn Chevalier](#model-18) | PMX | 49 | 49 | `zzz/chars/Evelyn Chevalier/Evelyn.pmx` |
| 19 | [Faruzan](#model-19) | PMX | 61 | 63 | `gi/chars/Faruzan/珐露珊.pmx` |
| 20 | [Ganyu](#model-20) | PMX | 59 | 60 | `gi/chars/Ganyu/Ganyu/甘雨.pmx` |
| 21 | [Hanya](#model-21) | PMX | 64 | 65 | `hsr/chars/Hanya/║«╤╗3.0.pmx` |
| 22 | [Jean](#model-22) | PMX | 60 | 60 | `gi/chars/Jean/Skin/琴.pmx` |
| 23 | [Jean](#model-23) | PMX | 45 | 46 | `gi/chars/Jean/Skin1/琴闲替衣装.pmx` |
| 24 | [Lucia](#model-24) | PMX | 48 | 50 | `zzz/chars/Lucia/Lucia.pmx` |
| 25 | [Lucy](#model-25) | PMX | 28 | 176 | `ww/chars/Lucy/Lucy.pmx` |
| 26 | [Lupa](#model-26) | BPMX | 102 | 147 | `ww/chars/Lupa/Lupa.bpmx` |
| 27 | [Neverness to Everness-Mint Swimsuit](#model-27) | PMX | 34 | 168 | `nte/chars/Mint/Mint_swimsuit/Mint.pmx` |
| 28 | [New MMD Model](#model-28) | PMX | 120 | 191 | — |
| 29 | [New MMD Model](#model-29) | PMX | 103 | 175 | — |
| 30 | [New MMD Model](#model-30) | PMX | 112 | 161 | — |
| 31 | [New MMD Model](#model-31) | PMX | 109 | 122 | — |
| 32 | [New MMD Model](#model-32) | PMX | 88 | 150 | `nte/chars/Zero (Male)/Zero_夏日澄空/Zero.pmx` |
| 33 | [Nicole](#model-33) | PMX | 64 | 64 | — |
| 34 | [Nicole](#model-34) | PMX | 42 | 42 | `zzz/chars/Nicole/Nicole Skin/妮可.pmx` |
| 35 | [Norano_WhiteHeart](#model-35) | PMX | 57 | 59 | — |
| 36 | [NPC_BelleChild_Model](#model-36) | PMX | 0 | 33 | — |
| 37 | [NPC_WiseChild_Model](#model-37) | PMX | 0 | 33 | — |
| 38 | [NTE - Zankou - Fashion](#model-38) | PMX | 75 | 136 | `nte/chars/Zankou/Zankou_Fashion_MMD/Zankou.pmx` |
| 39 | [Rosemary](#model-39) | PMX | 65 | 82 | `ww/chars/Rosemary/Rosemary.pmx` |
| 40 | [Saber](#model-40) | PMX | 69 | 85 | `hsr/chars/Saber/Saber.pmx` |
| 41 | [Shinku RPG](#model-41) | PMX | 99 | 99 | `nte/chars/Shinku/Shinku_RPG_MMD_v2/Shinku_RPG.pmx` |
| 42 | [Shinku Swimsuit](#model-42) | PMX | 99 | 99 | `nte/chars/Shinku/Shinku_Swimsuit_MMD_v2/Shinku_Swimsuit.pmx` |
| 43 | [Tribios](#model-43) | PMX | 54 | 55 | `hsr/chars/Tribios/大缇宝.pmx` |
| 44 | [Twiggy](#model-44) | PMX | 0 | 96 | `zzz/chars/Twiggy/Girl A/Girl A.pmx` |
| 45 | [Xiangli Yao](#model-45) | PMX | 100 | 138 | `ww/chars/Xiangli Yao/Xiangli Yao.pmx` |
| 46 | [Youhu](#model-46) | PMX | 101 | 124 | `ww/chars/Youhu/Youhu.pmx` |
| 47 | [尤诺](#model-47) | PMX | 60 | 62 | `ww/chars/Iuno/Iuno/Iuno.pmx` |
| 48 | [景燃](#model-48) | PMX | 113 | 130 | `ww/chars/Jingran/Jingran.pmx` |
| 49 | [莫宁](#model-49) | PMX | 99 | 117 | `ww/chars/Mornye/Mornye/Mornye.pmx` |
| 50 | [薄荷宿舍](#model-50) | PMX | 23 | 42 | `nte/chars/Mint/Mint_loungewear/Mint.pmx` |

## 3. Combined facial key index

Exact original names are kept distinct, including full-width digits, capitalization and suffixes. A key can appear in different categories or have different English labels in different models. Model IDs refer to Section 2. Controls found only under Other/System appear in the complete per-model inventory rather than this facial-category index.

| Exact key | English labels present | Facial categories | Model IDs |
|---|---|---|---|
| ` ウィンク２` | `E_Close` | Eye | 45 |
| `(○｀ε´○)` | `M_Anger`, `fasband.M_Anger` | Lip | 08, 12, 16, 17, 28, 29, 30, 45 |
| `-----口-----` |  | Lip | 27 |
| `-----目-----` |  | Eye | 27 |
| `-----眉-----` |  | Eyebrow | 27 |
| `Brow_Default` | `Brow_Default` | Eyebrow | 23 |
| `Brow_Shy_L` |  | Eyebrow | 04 |
| `Brow_Shy_R` |  | Eyebrow | 04 |
| `Brow_Squeeze_L` |  | Eyebrow | 04 |
| `Brow_Squeeze_R` |  | Eyebrow | 04 |
| `C_Down_Face` | `C_Down_Face`, `fasband.C_Down_Face` | Lip | 30, 45 |
| `C_Up_Face` | `C_Up_Face`, `fasband.C_Up_Face` | Lip | 30, 45 |
| `C_ZL_Face` | `C_ZL_Face`, `fasband.C_ZL_Face` | Lip | 30, 45 |
| `C_ZR_Face` | `C_ZR_Face`, `fasband.C_ZR_Face` | Lip | 30, 45 |
| `Down` | `Down`, `Pupil_Down` | Eye | 10, 11, 14, 15, 26, 39, 46, 48, 49 |
| `Down_L` | `Down_L` | Eye | 48 |
| `Down_R` | `Down_R` | Eye | 48 |
| `EB_Angry_01` | `EB_Angry_01` | Eyebrow | 07, 31 |
| `EB_Despise_01` | `EB_Despise_01` | Eyebrow | 07, 31, 32, 38 |
| `EB_Doubt_01` | `EB_Doubt_01` | Eyebrow | 07, 31, 32, 38 |
| `EB_Evil_01` | `EB_Evil_01` | Eyebrow | 07, 31, 32, 38 |
| `EB_Rotate_01` | `EB_Rotate_01` | Eyebrow | 07, 31, 32, 38 |
| `EB_Rotate_02` | `EB_Rotate_02` | Eyebrow | 07, 31, 32, 38 |
| `EB_Sad_01` | `EB_Sad_01` | Eyebrow | 07, 31 |
| `EB_Serious_01` | `EB_Serious_01` | Eyebrow | 07, 31 |
| `EB_Smile_01` | `EB_Smile_01` | Eyebrow | 07, 31, 38 |
| `EB_Surprised_01` | `EB_Surprised_01` | Eye, Eyebrow | 07, 31, 32 |
| `EB_Thinking_01` | `EB_Thinking_01` | Eyebrow | 07, 31, 38 |
| `EB_Tired_01` | `EB_Tired_01` | Eyebrow | 07, 31, 32, 38 |
| `EB_UD_L` | `EB_UD_L` | Eyebrow | 07, 31 |
| `EB_UD_R` | `EB_UD_R` | Eyebrow | 07, 31 |
| `EB_happy_01` | `EB_happy_01` | Eye, Eyebrow | 07, 31, 32, 38 |
| `EL_Angry_01_CLO` | `EL_Angry_01_CLO` | Eye | 07, 31, 32 |
| `EL_Angry_01_OP` | `EL_Angry_01_OP` | Eye | 07, 31, 32 |
| `EL_CornerDown` | `EL_CornerDown` | Eye | 07, 31, 32, 38 |
| `EL_CornerUp` | `EL_CornerUp` | Eye | 07, 31, 32, 38 |
| `EL_Despise_01_CLO` | `EL_Despise_01_CLO` | Eye | 07, 31, 32 |
| `EL_Despise_01_OP` | `EL_Despise_01_OP` | Eye | 07, 31, 32, 38 |
| `EL_Doubt_01_CLO` | `EL_Doubt_01_CLO` | Eye | 07, 31, 32, 38 |
| `EL_Doubt_01_OP` | `EL_Doubt_01_OP` | Eye | 07, 31, 32, 38 |
| `EL_Down` | `EL_Down` | Eye | 07, 31, 32, 38 |
| `EL_Evil_01_CLO` | `EL_Evil_01_CLO` | Eye | 07, 31, 32 |
| `EL_Evil_01_OP` | `EL_Evil_01_OP` | Eye | 07, 31, 32 |
| `EL_Happy_l_CLO` | `EL_Happy_l_CLO` | Eye | 07, 31 |
| `EL_Happy_r_CLO` | `EL_Happy_r_CLO` | Eye | 07, 31 |
| `EL_Light_L` | `EL_Light_L` | Eye | 07, 31, 32, 38 |
| `EL_Light_Lose` | `EL_Light_Lose` | Eye | 31 |
| `EL_Light_Up` | `EL_Light_Up` | Eye | 07, 31, 32, 38 |
| `EL_Sad_01_CLO` | `EL_Sad_01_CLO` | Eye | 07, 31, 32 |
| `EL_Sad_01_OP` | `EL_Sad_01_OP` | Eye | 07, 31, 32 |
| `EL_Serious_01_CLO` | `EL_Serious_01_CLO` | Eye | 07, 31, 32 |
| `EL_Serious_01_OP` | `EL_Serious_01_OP` | Eye | 07, 31, 32, 38 |
| `EL_Smile_01_CLO` | `EL_Smile_01_CLO` | Eye | 07, 31 |
| `EL_Surprised_01` | `EL_Surprised_01` | Eye | 07, 31 |
| `EL_Thinking_01_CLO` | `EL_Thinking_01_CLO` | Eye | 07, 31, 32 |
| `EL_Thinking_01_OP` | `EL_Thinking_01_OP` | Eye | 07, 31, 32, 38 |
| `EL_Tired_01_CLO` | `EL_Tired_01_CLO` | Eye | 07, 31, 32 |
| `EL_Tired_01_OP` | `EL_Tired_01_OP` | Eye | 07, 31 |
| `EL_Up` | `EL_Up` | Eye | 07, 31, 32 |
| `Eye_Default` | `Eye_Default` | Eye | 04, 23 |
| `Eye_Lowereyelid` | `3` | Eye | 04, 23 |
| `Eye_Tired` |  | Eye | 04 |
| `Eye_WDown` |  | Eye | 04 |
| `Eye_WUp` |  | Eye | 04 |
| `Eye_Wail` |  | Eye | 04 |
| `In_L` | `In_L` | Eye | 48 |
| `In_R` | `In_R` | Eye | 48 |
| `Left` | `Left`, `Pupil_L` | Eye | 10, 11, 14, 15, 26, 39, 46, 48, 49 |
| `M` | `M_Nutcracker`, `Mouth_Wave`, `fasband.M_Nutcracker` | Lip | 08, 12, 16, 17, 28, 29, 30, 33, 45 |
| `Mouth_BigTongue01` |  | Lip | 23 |
| `Mouth_Default` | `ger21` | Lip | 23 |
| `Mouth_Doya02` | `_L` | Lip | 23 |
| `Mouth_Line02` |  | Lip | 23 |
| `M口` | `h` | Lip | 01 |
| `Out_L` | `Out_L` | Eye | 48 |
| `Out_R` | `Out_R` | Eye | 48 |
| `Right` | `Pupil_R`, `Right` | Eye | 10, 11, 14, 15, 26, 39, 46, 48, 49 |
| `TDS_StarEyes` | `TDS_StarEyes` | Eye | 32 |
| `TD_BeanieEye` | `TD_BeanieEye` | Eye | 32 |
| `TD_EggEyes` | `TD_EggEyes` | Eye | 32 |
| `TD_EyesClo` | `TD_EyesClo` | Eye | 32 |
| `TD_SymbolEye` | `TD_SymbolEye` | Eye | 32 |
| `Up` | `Pupil_Up`, `Up` | Eye | 10, 11, 14, 15, 26, 39, 46, 48, 49 |
| `Up_L` | `Up_L` | Eye | 48 |
| `Up_R` | `Up_R` | Eye | 48 |
| `biyan` | `biyan` | Eye | 07, 31 |
| `biyan1` | `biyan1` | Eye | 07, 31, 32, 38 |
| `biyan_L` | `biyan_L` | Eye | 07, 31 |
| `biyan_R` | `biyan_R` | Eye | 07, 31 |
| `down` | `Pupil_Down`, `esh`, `fasband2.Pupil_Down` | Eye | 01, 08, 12, 16, 17, 28, 29, 30, 45 |
| `ee` | `S_18` | Lip | 28 |
| `eye al` |  | Eye | 08 |
| `eye hi al` |  | Eye | 08 |
| `eye hi off` |  | Eye | 08 |
| `eye hi2 al` |  | Eye | 08 |
| `eye hi2 off` |  | Eye | 08 |
| `eye off` |  | Eye | 08 |
| `eye 風` |  | Eye | 29 |
| `eye_SF` | `eye_SF` | Eye | 07, 31 |
| `face behind move` | `S_11` | Lip | 45 |
| `highlight off` |  | Eye | 43 |
| `hu~` | `S_20` | Lip | 28 |
| `jawOpen` | `jawOpen` | Lip | 07, 31, 32 |
| `jawOpen_Angry_01_CLO` | `jawOpen_Angry_01_CLO` | Lip | 07, 31, 32, 38 |
| `jawOpen_Angry_01_OP` | `jawOpen_Angry_01_OP` | Lip | 07, 31, 32, 38 |
| `jawOpen_Despise_01_CLO` | `jawOpen_Despise_01_CLO` | Lip | 07, 31, 32, 38 |
| `jawOpen_Despise_01_OP` | `jawOpen_Despise_01_OP` | Lip | 07, 31, 32, 38 |
| `jawOpen_Doubt_01_CLO` | `jawOpen_Doubt_01_CLO` | Lip | 07, 31, 32, 38 |
| `jawOpen_Doubt_01_OP` | `jawOpen_Doubt_01_OP` | Lip | 07, 31, 32, 38 |
| `jawOpen_Evil_01_CLO` | `jawOpen_Evil_01_CLO` | Lip | 07, 31, 32, 38 |
| `jawOpen_Evil_01_OP` | `jawOpen_Evil_01_OP` | Lip | 07, 31, 38 |
| `jawOpen_Happy_01_CLO` | `jawOpen_Happy_01_CLO` | Lip | 07, 31, 32, 38 |
| `jawOpen_Happy_01_OP` | `jawOpen_Happy_01_OP` | Lip | 07, 31, 32 |
| `jawOpen_Sad_01_CLO` | `jawOpen_Sad_01_CLO` | Lip | 07, 31, 32, 38 |
| `jawOpen_Sad_01_OP` | `jawOpen_Sad_01_OP` | Lip | 07, 31, 32, 38 |
| `jawOpen_Smile_01_CLO` | `jawOpen_Smile_01_CLO` | Lip | 07, 31, 32, 38 |
| `jawOpen_Smile_01_OP` | `jawOpen_Smile_01_OP` | Lip | 07, 31, 32, 38 |
| `jawOpen_Surprised_01_CLO` | `jawOpen_Surprised_01_CLO` | Lip | 07, 31, 32, 38 |
| `jawOpen_Surprised_01_OP` | `jawOpen_Surprised_01_OP` | Lip | 07, 31, 32, 38 |
| `jawOpen_Tired_01_CLO` | `jawOpen_Tired_01_CLO` | Lip | 07, 31, 32, 38 |
| `jawOpen_Tired_01_OP` | `jawOpen_Tired_01_OP` | Lip | 07, 31, 32, 38 |
| `jawOpen_Zhenjing_01_OP` | `jawOpen_Zhenjing_01_OP` | Lip | 32 |
| `jawOpen_a` | `jawOpen_a` | Lip | 07, 31 |
| `jawOpen_ei` | `jawOpen_ei` | Lip | 07, 31 |
| `jawOpen_o` | `jawOpen_o` | Lip | 07, 31 |
| `jawOpen_wu` | `jawOpen_wu` | Lip | 07, 31 |
| `jawOpen_yi` | `jawOpen_yi` | Lip | 07, 31 |
| `left` | `Pupil_L`, `esh`, `fasband2.Pupil_L` | Eye | 01, 12, 16, 17, 28, 29, 30, 45 |
| `lip back` | `S_06` | Lip | 28 |
| `lip back2` | `S_07` | Lip | 28 |
| `lip behind` | `S_06` | Lip | 12 |
| `lip off` | `S_28` | Lip | 28 |
| `lip thick` | `C_M_Distant`, `fasband.C_M_Distant` | Lip | 01, 08, 12, 28, 29, 30, 45 |
| `lip thin` | `P_M_MidPoint_Add`, `fasband.P_M_MidPoint_Add` | Lip | 08, 12, 28, 29, 30 |
| `lip thin 2` | `fasband.S_28` | Lip | 30 |
| `lip thin2` | `S_28` | Lip | 29 |
| `lip thin3` | `fasband.S_06` | Lip | 30 |
| `lip thin4` | `fasband.S_07` | Lip | 30 |
| `look_D` | `look_D` | Eye | 07, 31, 32, 38 |
| `look_L` | `look_L` | Eye | 07, 31, 32, 38 |
| `look_LD` | `look_LD` | Eye | 07, 31, 32, 38 |
| `look_LU` | `look_LU` | Eye | 07, 31, 32, 38 |
| `look_R` | `look_R` | Eye | 07, 31, 32, 38 |
| `look_RD` | `look_RD` | Eye | 07, 31, 32, 38 |
| `look_RU` | `look_RU` | Eye | 07, 31, 32, 38 |
| `look_U` | `look_U` | Eye | 07, 31, 32, 38 |
| `mouthFunnel` | `mouthFunnel` | Lip | 07, 31, 32, 38 |
| `mouthPucker` | `mouthPucker` | Lip | 07, 31, 32 |
| `mouthRollLower` | `mouthRollLower` | Lip | 07, 31, 32, 38 |
| `mouthRollUpper` | `mouthRollUpper` | Lip | 07, 31, 32, 38 |
| `nose off` | `S_01` | Lip | 45 |
| `right` | `Pupil_R`, `esh`, `fasband2.Pupil_R` | Eye | 01, 12, 16, 17, 28, 29, 30, 45 |
| `teeth up` | `S_24` | Lip | 28 |
| `up` | `Pupil_Up`, `fasband2.Pupil_Up` | Eye | 01, 08, 12, 16, 17, 28, 29, 30, 45 |
| `w` | `M_Anger` | Lip | 09 |
| `ω` | `LegBagB R A02`, `Mouth_Neko01`, `_R`, `e_WinkB_R`, `ip001 R Foot`, `omega` | Lip | 01, 04, 05, 06, 19, 20, 22, 23, 27, 33, 50 |
| `ω□` | `omegawa` | Lip | 27, 50 |
| `д` | `M_Scared`, `esh`, `fasband.M_Scared` | Lip | 01, 08, 12, 16, 17, 28, 29, 30, 45 |
| `д左` | `S_04` | Lip | 29 |
| `д左2` | `S_08` | Lip | 29 |
| `∧` | `M_Ennui_R`, `M_Nutcracker`, `Mouth_Angry04`, `Mouth_Twisted01`, `∧` | Lip | 01, 08, 10, 11, 12, 14, 15, 16, 17, 25, 26, 27, 28, 29, 30, 33, 40, 41, 42, 45, 46, 47, 48, 49 |
| `∨` | `Mouth_Smile03` | Lip | 33 |
| `□` | `Fac_Mth_AaShout`, `M_A`, `M_Scared`, `Mouth_Aa2_NuoCha`, `Mouth_Angry02`, `Mouth_Angry04`, `ger42`, `□` | Lip | 03, 04, 09, 10, 11, 14, 15, 21, 23, 26, 34, 41, 42, 43, 46, 47, 48, 49 |
| `□1` | `Mouth_Angry03` | Lip | 04, 21, 43 |
| `□2` | `Mouth_Angry02`, `Mouth_Angry04` | Lip | 04, 21, 43 |
| `□3` | `Mouth_Pain03`, `Mouth_Worry02` | Lip | 21, 43 |
| `□4` | `Mouth_Pain04`, `Mouth_Worry03` | Lip | 21, 43 |
| `□5` | `Mouth_Worry02`, `Mouth_Worry04` | Lip | 21, 43 |
| `□6` | `Mouth_Worry03` | Lip | 21 |
| `□7` | `Mouth_Worry04` | Lip | 21 |
| `□２` | `M_ScaredTooth` | Lip | 09 |
| `▲` | `Fac_Mth_Triangle`, `Mouth_△_NuoCha`, `iMd10011_`, `▲` | Lip | 01, 03, 27, 34, 41, 42, 50 |
| `あ` | `A`, `Aa`, `Fac_Mth_Aa`, `Fac_Mth_Aa1`, `HemB L D04`, `M_A`, `Mouth_A`, `Mouth_A01`, `Mouth_AaTalk_NuoCha`, `SkirtF R B04`, `a`, `fasband.A`, `ger32`, `jawOpen_a`, `ow_Up_L`, `あ` | Lip | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48, 49, 50 |
| `あ2` | `jawOpen`, `あ2` | Lip | 07, 27, 31, 38, 41, 42 |
| `あ3` | `M_A`, `fasband.M_A` | Lip | 08, 12, 16, 17, 29, 30, 45 |
| `あ4` | `A` | Lip | 28 |
| `ああ` | `M_Trapezoid`, `Mouth_Aa3Shout_NuoCha`, `ああ` | Lip | 10, 11, 14, 15, 26, 34, 46, 47, 48, 49 |
| `あ１` | `Fac_Mth_Aa1` | Lip | 24, 35 |
| `あ２` | `A`, `Aa`, `Fac_Mth_Aa1`, `M_Trapezoid`, `Mouth_Fury01`, `Mouth_Max`, `e_WinkA_L`, `fasband.M_Trapezoid`, `ger42_e`, `ip001 L Toe0`, `ip001 R Foot`, `あ２` | Lip | 02, 03, 05, 06, 09, 10, 11, 12, 14, 15, 16, 17, 19, 20, 21, 22, 23, 25, 26, 28, 29, 30, 33, 39, 43, 45, 46, 48, 49 |
| `あ３` | `M_Trapezoid` | Lip | 09 |
| `い` | `E`, `Fac_Mth_Ii`, `Fac_Mth_Laugh2`, `HemB L D05`, `I`, `Mouth_I`, `Mouth_Ii_NuoCha`, `Mouth_Open01`, `S_03`, `SkirtF CF B02`, `fasband.I`, `ger22_e`, `i`, `iMd10011_`, `jawOpen_yi`, `ow_Up_R`, `い` | Lip | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48, 49, 50 |
| `い1` | `Mouth_Delta02`, `Mouth_N` | Lip | 21, 43 |
| `い2` | `M_ScaredTooth`, `Mouth_Delta02`, `Mouth_N`, `fasband.M_ScaredTooth`, `ger41` | Lip | 01, 08, 12, 16, 17, 21, 23, 28, 29, 30, 40, 45 |
| `い3` | `M_OpenSmall`, `fasband.M_OpenSmall` | Lip | 08, 12, 16, 17, 28, 29, 30, 45 |
| `いい` | `I`, `M_Laugh`, `S_01`, `fasband.M_Laugh`, `sh` | Lip | 01, 08, 12, 15, 16, 17, 28, 29, 30, 45, 47 |
| `いい2` | `S_01` | Lip | 28, 29 |
| `いい3` | `S_02` | Lip | 28 |
| `いい4` | `S_04`, `fasband.S_08` | Lip | 28, 30 |
| `いい5` | `S_08` | Lip | 28 |
| `いい6` | `S_09` | Lip | 28 |
| `いい左` | `S_03` | Lip | 29 |
| `いい２` | `I` | Lip | 12 |
| `い１` | `B L A01+HemB L B03`, `Mouth_Angry02`, `ip001 L Calf`, `ip001 L Toe0Nub`, `ow_Squeeze_R` | Lip | 05, 06, 19, 20, 22, 33 |
| `い２` | `Fac_Mth_Ii`, `Fac_Mth_Laugh2`, `M_OpenSmall`, `M_ScaredTooth`, `Mouth_Angry03`, `Mouth_Laugh2_NuoCha`, `e_Default`, `ip001 L Foot`, `ip001 R Calf`, `い２` | Lip | 03, 05, 06, 09, 10, 11, 14, 15, 18, 19, 20, 22, 26, 33, 34, 46, 47, 48, 49 |
| `い３` | `M_Laugh` | Lip | 09 |
| `う` | `Fac_Mth_Uu`, `HemB L D04`, `Mouth_Minimum`, `Mouth_Open01`, `Mouth_U`, `Mouth_Uu_NuoCha`, `SkirtF R B04`, `U`, `fasband.U`, `iMd10011_`, `jawOpen_wu`, `mouthFunnel`, `ow_Up_R`, `u`, `う` | Lip | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48, 49, 50 |
| `う2` | `う2` | Lip | 07 |
| `うう` | `S_01` | Lip | 46 |
| `う２` | `Fac_Mth_UuOo`, `M_OpenSmall`, `S_01`, `S_04`, `う２` | Lip | 09, 10, 11, 12, 14, 15, 24, 26, 35, 46, 47, 48, 49 |
| `う＿` | `S_14` | Lip | 28 |
| `え` | `E`, `Fac_Mth_Aa2`, `Fac_Mth_Ee`, `HemB L D04`, `I`, `M_A`, `Mouth_E`, `Mouth_Open01`, `Mouth_Uu_NuoCha`, `SkirtF R B04`, `fasband.E`, `ger22`, `iMd10011_`, `jawOpen_ei`, `ow_Up_R`, `え` | Lip | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48, 49, 50 |
| `え1` | `Mouth_Delta03` | Lip | 21 |
| `え2` | `E`, `Mouth_Delta03`, `S_01` | Lip | 01, 12, 28, 40 |
| `え3` | `Mouth_Worry03`, `S_02` | Lip | 12, 40 |
| `え5` | `S_11` | Lip | 28 |
| `えー` | `Mouth_Worry04` | Lip | 01, 27, 40 |
| `え２` | `Fac_Mth_Ee`, `Mouth_Ee_NuoCha` | Lip | 03, 34 |
| `お` | `Fac_Mth_Oo`, `Fac_Mth_UuOo`, `HemB L D04`, `Mouth_O`, `Mouth_Open01`, `Mouth_UuOo_NuoCha`, `O`, `SkirtF R B04`, `fasband.O`, `iMd10011_`, `jawOpen_o`, `o`, `ow_Up_R`, `お` | Lip | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48, 49, 50 |
| `お1` | `Mouth_U` | Lip | 21, 43 |
| `お2` | `M_O`, `Mouth_Minimum`, `esh`, `fasband.M_O` | Lip | 01, 08, 12, 16, 17, 28, 29, 30, 40, 45 |
| `お２` | `Fac_Mth_Oo`, `Fac_Mth_UuOo`, `M_O`, `Mouth_Oo_NuoCha`, `お２` | Lip | 03, 09, 10, 11, 14, 15, 18, 26, 34, 46, 47, 48, 49 |
| `くぬ` | `S_25` | Lip | 28 |
| `くぬぬ～` | `S_21` | Lip | 28 |
| `くぬぬ～2` | `S_22` | Lip | 28 |
| `くぬぬ～3` | `S_23` | Lip | 28 |
| `じと目` | `A02+VisionPelvisS L `, `EL_Tired_01_OP`, `E_Insipid`, `Eye_Jito`, `Eye_Sweat01`, `Eye_半闭_NuoCha`, `Fac_Eye_HalfClose`, `doubt`, `fasband.E_Insipid`, `iMd10011_`, `outh_Neko01`, `ow_Trouble_L`, `row_Angry_R`, `じと目` | Eye, Eyebrow | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48, 49, 50 |
| `じと目0` | `Eye_Sweat01` | Eye | 21 |
| `じと目1` | `Eye_Sweat02` | Eye | 21 |
| `じと目2` | `2`, `E_Focus`, `Eye_Sweat02`, `fasband.E_Focus`, `iMd10011_` | Eye | 01, 08, 12, 16, 17, 23, 28, 29, 30, 40, 45 |
| `じと目3` | `S_19`, `fasband.S_04` | Eye | 28, 30 |
| `じと目L` | `E_Insipid`, `fasband.E_Insipid`, `iMd10011_` | Eye | 01, 08, 12, 16, 17, 26, 28, 29, 30, 45 |
| `じと目R` | `E_Insipid`, `fasband.E_Insipid`, `iMd10011_` | Eye | 01, 08, 12, 16, 17, 26, 28, 29, 30, 45 |
| `じと目右` | `E_Insipid`, `じと目右` | Eye | 10, 11, 14, 15, 39, 46, 48, 49 |
| `じと目左` | `E_Insipid`, `じと目左` | Eye | 10, 11, 14, 15, 39, 46, 48, 49 |
| `たれ目` | `E_Focus`, `たれ目` | Eye | 10, 11, 14, 15, 26, 39, 46, 47, 48, 49 |
| `たれ目L` | `E_Focus` | Eye | 26 |
| `たれ目R` | `E_Focus` | Eye | 26 |
| `たれ目右` | `E_Focus`, `たれ目右` | Eye | 10, 11, 14, 15, 39, 46, 48, 49 |
| `たれ目左` | `E_Focus`, `たれ目左` | Eye | 10, 11, 14, 15, 39, 46, 48, 49 |
| `つ` | `Mesh` | Lip | 01 |
| `てへぺろ` | `LegBagB R A03`, `Mouth_Pero01`, `Nub`, `e_WinkC_L`, `ip001 R Toe0` | Lip | 04, 05, 06, 19, 20, 22, 23, 33 |
| `てへぺろ ` | `S_02` | Lip | 46 |
| `なごみ` | `= =`, `A03+VisionPelvisS R `, `Eye_WinkC_L`, `outh_Fury01`, `p001 R Toe0`, `row_Smily_L` | Eye | 01, 02, 04, 05, 06, 08, 12, 16, 17, 19, 20, 21, 22, 27, 28, 29, 30, 33, 40, 41, 42, 45 |
| `なごみ2` |  | Eye | 04 |
| `なごみL` |  | Eye | 01, 08, 12, 16, 17, 28, 29, 30, 45 |
| `なごみR` |  | Eye | 01, 08, 12, 16, 17, 28, 29, 30, 45 |
| `なごみ右` | `A04+VisionPelvisS L `, `Eye_WinkC_R`, `_R`, `outh_Doya01`, `p001 R Toe0Nub`, `row_Smily_R` | Eye | 05, 06, 19, 20, 22, 23, 33 |
| `なごみ左` | `A03+VisionPelvisS R `, `Eye_WinkC_L`, `_L`, `outh_Fury01`, `p001 R Toe0`, `row_Smily_L` | Eye | 05, 06, 19, 20, 22, 23, 33 |
| `なぬ！` | `confuse` | Eye | 27 |
| `なんで` | `M_Scared`, `なんで` | Lip | 10, 11, 14, 15, 26, 39, 46, 47, 48, 49 |
| `にこり` | `B_Cheerful`, `B_Happy`, `Brow_Smily_L`, `EB_Relax_NuoCha`, `EB_Smile_01`, `EB_Surprised_01`, `Fac_Ebr_Smile`, `cheerful`, `d`, `fasband.B_Happy`, `iMd10011_`, `outh_Smile01`, `owknotS R A41`, `ye_WinkB_R`, `にこり` | Eyebrow | 01, 02, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 41, 42, 43, 45, 46, 47, 48, 49 |
| `にこり2` | `B_Cheerful`, `fasband.B_Cheerful`, `iMd10011_` | Eyebrow | 01, 08, 12, 16, 17, 28, 29, 30, 45 |
| `にこり3` | `iMd10011_` | Eyebrow | 01 |
| `にこりL` | `B_Happy`, `fasband.B_Happy`, `iMd10011_` | Eyebrow | 01, 08, 12, 16, 17, 26, 28, 29, 30, 45 |
| `にこりR` | `B_Happy`, `fasband.B_Happy`, `iMd10011_` | Eyebrow | 01, 08, 12, 16, 17, 26, 28, 29, 30, 45 |
| `にこり右` | `B_Happy`, `Brow_Smily_R`, `outh_Smile02`, `owknotS R A42`, `ye_WinkC_L`, `にこり右` | Eyebrow | 05, 06, 10, 11, 14, 15, 19, 20, 22, 33, 39, 46, 48, 49 |
| `にこり左` | `B_Happy`, `Brow_Smily_L`, `outh_Smile01`, `owknotS R A41`, `ye_WinkB_R`, `にこり左` | Eyebrow | 05, 06, 10, 11, 14, 15, 19, 20, 22, 33, 39, 46, 48, 49 |
| `にこり２` | `B_Cheerful`, `B_Happy`, `にこり２` | Eyebrow | 09, 10, 11, 14, 15, 26, 46, 47, 48, 49 |
| `にこり２L` | `B_Cheerful` | Eyebrow | 26 |
| `にこり２R` | `B_Cheerful` | Eyebrow | 26 |
| `にこり２右` | `B_Cheerful`, `にこり２右` | Eyebrow | 10, 11, 14, 15, 46, 48, 49 |
| `にこり２左` | `B_Cheerful`, `にこり２左` | Eyebrow | 10, 11, 14, 15, 46, 48, 49 |
| `にっこり` | `jawOpen_Smile_01_OP` | Lip | 04, 25, 41, 42 |
| `にやり` | `Fac_Mth_L_Up`, `Fac_Mth_R_Up`, `M_Smile_R`, `Mouth_Smile01`, `SkirtF CF B03`, `grin`, `ip001 L Calf`, `jawOpen_Evil_01_OP`, `ow_Down_L` | Lip | 01, 02, 03, 04, 05, 06, 08, 09, 12, 16, 17, 18, 19, 20, 22, 25, 27, 28, 29, 30, 33, 40, 41, 42, 45 |
| `にやり2` | `S_05` | Lip | 45 |
| `にやり２` | `Fac_Mth_R_Up`, `M_Smile_L`, `Mouth_Doya01`, `Mouth_Proud01`, `e_WinkA_R`, `ip001 R Thigh`, `ip001 R Toe0`, `jawOpen_Evil_01_OP` | Lip | 03, 04, 05, 06, 09, 19, 20, 21, 22, 23, 25, 32, 33, 40, 43 |
| `にやり２1` | `Mouth_Proud02` | Lip | 21, 43 |
| `にやり３` | `Mouth_Doya02`, `Mouth_Proud02`, `e_WinkB_L`, `ip001 R Calf`, `ip001 R Toe0Nub` | Lip | 05, 06, 19, 20, 22, 33, 40 |
| `はぁと` | `はぁと` | Eye | 02, 08, 12, 14, 16, 17, 28, 29, 30, 45 |
| `はぁと2` | `はぁと2` | Eye | 14 |
| `はぅ` | `&gt;&lt;` | Eye | 01, 02, 04, 05, 08, 12, 16, 17, 21, 27, 28, 29, 30, 40, 41, 42, 45 |
| `はちゅ目` |  | Eye | 01, 02, 04, 08, 12, 16, 17, 21, 28, 29, 30, 40, 45 |
| `はんっ！` |  | Lip | 27 |
| `は？` | `S_13` | Lip | 28 |
| `びっくり` | `A01+VisionPelvisS L `, `EL_Surprised_01`, `E_Stare`, `Eye_Ha`, `Eye_Open_R_NuoCha`, `Eye_Surprise01`, `Eye_Surprise02`, `Fac_Eye_Open`, `Fac_Eye_R_Open`, `fasband2.E_Stare`, `iMd10011_`, `outh_Doya02`, `ow_Default`, `row_Angry_L`, `surprise`, `t`, `びっくり` | Eye | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14, 15, 16, 17, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48, 49 |
| `びっくり1` | `Eye_Gentle01` | Eye | 21 |
| `びっくり2` | `Eye_Gentle02`, `fasband.S_01` | Eye | 21, 30 |
| `びっくり3` | `Eye_Surprise01` | Eye | 21 |
| `びっくりL` | `E_Stare` | Eye | 26 |
| `びっくりR` | `E_Stare` | Eye | 26 |
| `びっくり右` | `E_Stare`, `Eye_Open_R_NuoCha`, `Fac_Eye_R_Open`, `びっくり右` | Eye | 03, 10, 11, 14, 15, 18, 24, 34, 35, 39, 46, 48, 49 |
| `びっくり左` | `E_Stare`, `Eye_Open_L_NuoCha`, `Fac_Eye_L_Open`, `びっくり左` | Eye | 03, 10, 11, 14, 15, 18, 24, 34, 35, 39, 46, 48, 49 |
| `びっくり２` | `Eye_Angry_NuoCha` | Eye | 34 |
| `ぺろっ` | `Mouth_Pero02`, `PelvisTwist CF A01`, `S_03`, `VisionPelvisS L E02+`, `e_WinkC_R`, `tongue left` | Lip | 02, 04, 05, 06, 08, 09, 12, 16, 17, 19, 20, 22, 23, 27, 28, 29, 30, 33, 45 |
| `ぺろっ ` |  | Lip | 01 |
| `ぺろっ２` | `S_04` | Lip | 09 |
| `まばたき` | `A01+VisionPelvisS R `, `E_Close`, `Eye_Close01`, `Eye_Close_NuoCha`, `Eye_WinkB_L`, `Fac_Eye_Close`, `biyan`, `close`, `fasband.E_Close`, `iMd10011_`, `outh_Angry02`, `p001 R Calf`, `row_Trouble_L`, `まばたき` | Eye | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48, 49, 50 |
| `まばたき右` | `E_Close` | Eye | 15 |
| `まばたき左` | `E_Close` | Eye | 15 |
| `やっかい` | `Brow_Trouble` | Eyebrow | 40 |
| `ん` | `M_Anger`, `Mouth_Angry01`, `Mouth_N`, `ip001 L Thigh`, `ip001 L Toe0`, `ow_Squeeze_L`, `ん` | Lip | 05, 06, 07, 10, 11, 14, 15, 19, 20, 22, 26, 33, 40, 41, 42, 46, 47, 48, 49 |
| `ん２` | `C_M_Distant`, `ん２` | Lip | 10, 11, 14, 15, 26, 46, 48, 49 |
| `ウィンク` | `EL_Happy_r_CLO`, `EYE_Wink_L_NuoCha`, `E_Smile_L`, `Eye_Close02`, `Eye_WinkA_L`, `Fac_Eye_L_Wink`, `fasband.E_Smile_L`, `iMd10011_`, `outh_BigTongue01`, `outh_Smile02`, `p001 L Toe0`, `wink`, `ウィンク` | Eye | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48, 49 |
| `ウィンク2` |  | Eye | 27, 49 |
| `ウィンク2右` |  | Eye | 49 |
| `ウィンク右` | `EL_Happy_l_CLO`, `EYE_Wink_R_NuoCha`, `E_Smile_R`, `Eye_Close02`, `Eye_WinkA_R`, `Fac_Eye_R_Wink`, `fasband.E_Smile_R`, `iMd10011_`, `outh_Angry01`, `p001 L Toe0Nub`, `row_Default`, `wink R`, `ウィンク右` | Eye | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48, 49 |
| `ウィンク２` | `A01+VisionPelvisS R `, `E_Close`, `E_Close_L`, `Eye_Close01`, `Eye_Close_NuoCha`, `Eye_WinkB_L`, `Fac_Eye_Close`, `Fac_Eye_L_Close`, `biyan_L`, `fasband.E_Close`, `iMd10011_`, `outh_Angry02`, `p001 R Calf`, `row_Trouble_L`, `ウィンク２` | Eye | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 46, 48 |
| `ウィンク２R` | `E_Close` | Eye | 26 |
| `ウィンク２右` | `A02+VisionPelvisS R `, `E_Close`, `Eye_Close_NuoCha`, `Eye_WinkB_R`, `Fac_Eye_Close`, `Fac_Eye_R_Close`, `outh_Angry03`, `p001 R Foot`, `row_Trouble_R`, `ウィンク２右` | Eye | 02, 03, 05, 06, 09, 10, 11, 14, 19, 20, 22, 23, 24, 27, 33, 34, 35, 39, 46, 48 |
| `カメラ目` | `カメラ目` | Eye | 10, 11, 14, 15, 26, 46, 48, 49 |
| `キリッ` | `E_Anger`, `キリッ` | Eye | 10, 11, 14, 15, 26, 39, 46, 47, 48, 49 |
| `キリッL` | `E_Anger` | Eye | 26 |
| `キリッR` | `E_Anger` | Eye | 26 |
| `キリッ上` | `1` | Eye | 23 |
| `キリッ下` | `2` | Eye | 23 |
| `キリッ右` | `E_Anger`, `キリッ右` | Eye | 10, 11, 14, 15, 39, 46, 48, 49 |
| `キリッ左` | `E_Anger`, `キリッ左` | Eye | 10, 11, 14, 15, 39, 46, 48, 49 |
| `ジト目` | `E_Focus`, `Eye_Tired`, `outh_Line01`, `ow_Smily_R`, `row_Up_L` | Eye | 05, 06, 09, 19, 20, 22, 33 |
| `ハイライト上` | `EL_Light_Up` | Eye | 41, 42 |
| `ハイライト左` | `EL_Light_L` | Eye | 41, 42 |
| `ハイライト消` | `EL_Light_Lose`, `ハイライト消` | Eye | 10, 11, 14, 15, 26, 31, 41, 42, 46, 50 |
| `ハイライト消L` | `ハイライト消` | Eye | 26 |
| `ハイライト消R` | `ハイライト消` | Eye | 26 |
| `ハイライト消し` | `ハイライト消し` | Eye | 48, 49 |
| `ハイライト消し右` |  | Eye | 49 |
| `ハイライト消し左` |  | Eye | 49 |
| `ハイライト消右` |  | Eye | 10, 11, 14, 15, 46 |
| `ハイライト消左` |  | Eye | 10, 11, 14, 15, 46 |
| `ムッ` | `Mouth_Angry01` | Lip | 40 |
| `リラックス右` | `Fac_Ebr_R_Relax` | Eyebrow | 24, 35 |
| `リラックス左` | `Fac_Ebr_L_Relax` | Eyebrow | 24, 35 |
| `ワ` | `Aa`, `Fac_Mth_AaTalk`, `M_Laugh`, `M_Trapezoid`, `Mouth_Laugh_NuoCha`, `Mouth_Smile02`, `Mouth_Smile04`, `S_03`, `SkirtF CF B04`, `iMd10011_`, `ip001 L Foot`, `jawOpen_Happy_01_OP`, `ow_Down_R`, `ワ` | Lip | 01, 03, 05, 06, 07, 08, 09, 10, 11, 14, 15, 18, 19, 20, 21, 22, 24, 26, 28, 31, 33, 34, 35, 38, 39, 40, 41, 42, 43, 46, 47, 48, 49 |
| `ワ1` | `Mouth_Smile03` | Lip | 21, 40, 43 |
| `ワ2` | `Mouth_Smile02` | Lip | 21, 40, 43 |
| `ワ3` | `Mouth_Smile01` | Lip | 43 |
| `ワ左` | `S_02` | Lip | 29 |
| `ワ２` | `Fac_Mth_Laugh1`, `Mouth_Aa1_NuoCha` | Lip | 03, 34 |
| `ワ３` | `Fac_Mth_Laugh3` | Lip | 03 |
| `上` | `B_Up_Add`, `Brow_Up`, `Brow_Up_L`, `EB_↑_NuoCha`, `Fac_Ebr_Up`, `fasband.B_Up_Add`, `ger01`, `go up`, `iMd10011_`, `outh_Doya01`, `owknotF R A65`, `ye_Hostility`, `上` | Eyebrow | 01, 02, 04, 05, 06, 08, 09, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 33, 34, 35, 39, 40, 41, 42, 43, 45, 46, 47, 48, 49, 50 |
| `上L` | `B_Up_Add`, `fasband.B_Up_Add`, `iMd10011_` | Eyebrow | 01, 08, 12, 16, 17, 26, 28, 29, 30, 45 |
| `上R` | `B_Up_Add`, `fasband.B_Up_Add`, `iMd10011_` | Eyebrow | 01, 08, 12, 16, 17, 26, 28, 29, 30, 45 |
| `上lip 調整` | `S_06` | Lip | 45 |
| `上lip 調整2` | `S_07` | Lip | 45 |
| `上右` | `B_Up_Add`, `Brow_Up_R`, `EB_UD_R`, `Fac_Ebr_R_Up`, `outh_Doya02`, `owknotF R A62`, `ye_Tired`, `上右` | Eyebrow | 05, 06, 10, 11, 14, 15, 19, 20, 22, 24, 32, 33, 35, 39, 46, 48, 49 |
| `上唇巻き` | `mouthRollUpper` | Lip | 41, 42 |
| `上唇後` | `S_06` | Lip | 09 |
| `上左` | `B_Up_Add`, `Brow_Up_L`, `EB_UD_L`, `Fac_Ebr_L_Up`, `outh_Doya01`, `owknotF R A65`, `ye_Hostility`, `上左` | Eyebrow | 05, 06, 10, 11, 14, 15, 19, 20, 22, 24, 32, 33, 35, 39, 46, 48, 49 |
| `上牙上` | `fasband.S_24` | Lip | 30 |
| `上牙下` | `fasband.S_25` | Lip | 30 |
| `下` | `B_Down_Add`, `Brow_Down`, `Brow_Down_L`, `EB_Thinking_01`, `EB_↓_NuoCha`, `Fac_Ebr_Down`, `fasband.B_Down_Add`, `ger02_e`, `iMd10011_`, `outh_Neko01`, `owknotF R A63`, `ye_WUp`, `下` | Eyebrow | 01, 02, 04, 05, 06, 08, 09, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 33, 34, 35, 39, 40, 41, 42, 43, 45, 46, 47, 48, 49, 50 |
| `下L` | `B_Down_Add`, `fasband.B_Down_Add`, `iMd10011_` | Eyebrow | 01, 08, 12, 16, 17, 26, 28, 29, 30, 45 |
| `下R` | `B_Down_Add`, `fasband.B_Down_Add`, `iMd10011_` | Eyebrow | 01, 08, 12, 16, 17, 26, 28, 29, 30, 45 |
| `下右` | `B_Down_Add`, `Brow_Down_R`, `Fac_Ebr_R_Down`, `kirtF CF B02`, `outh_Pero01`, `ye_WDown`, `下右` | Eyebrow | 05, 06, 10, 11, 14, 15, 19, 20, 22, 24, 33, 35, 39, 46, 48, 49 |
| `下唇巻き` | `mouthRollLower` | Lip | 41, 42 |
| `下左` | `B_Down_Add`, `Brow_Down_L`, `Fac_Ebr_L_Down`, `outh_Neko01`, `owknotF R A63`, `ye_WUp`, `下左` | Eyebrow | 05, 06, 10, 11, 14, 15, 19, 20, 22, 24, 33, 35, 39, 46, 48, 49 |
| `下牙上` | `fasband.S_26` | Lip | 30 |
| `下牙下` | `fasband.S_27` | Lip | 30 |
| `下眼up` | `ye_Default` | Eye | 05 |
| `下眼上` | `EL_Up`, `E_Blephar`, `Eye_Lowereyelid`, `Eye_下眼睑↑_NuoCha`, `Fac_Eye_LowlidUp`, `ow_Shy_L`, `row_Down_R`, `下眼上` | Eye | 03, 06, 07, 09, 18, 19, 20, 22, 24, 33, 34, 35, 38 |
| `中` | `B_Inside_Add`, `fasband.B_Inside_Add` | Eyebrow | 08, 12, 16, 17, 28, 29, 30, 45 |
| `倒ω` | `Mouth_Angry01`, `Mouth_Pain01` | Lip | 21, 40, 43 |
| `入` | `B_Inside_Add`, `入` | Eyebrow | 10, 11, 14, 15, 26, 46, 47, 48, 49 |
| `入L` | `B_Inside_Add` | Eyebrow | 26 |
| `入R` | `B_Inside_Add` | Eyebrow | 26 |
| `入右` | `B_Inside_Add`, `入右` | Eyebrow | 10, 11, 14, 15, 46, 48, 49 |
| `入左` | `B_Inside_Add`, `入左` | Eyebrow | 10, 11, 14, 15, 46, 48, 49 |
| `八` | `Fac_Ebr_Sad` | Eyebrow | 35 |
| `八右` | `Fac_Ebr_R_Sad` | Eyebrow | 24, 35 |
| `八左` | `Fac_Ebr_L_Sad` | Eyebrow | 24, 35 |
| `前` | `Brow_Squeeze_L`, `kirtF CF B03`, `outh_Pero02`, `ye_Lowereyelid` | Eyebrow | 05, 06, 19, 20, 22, 33 |
| `前右` | `Brow_Squeeze_R`, `Fac_Ebr_R_Front`, `outh_Line01`, `p001 L Calf`, `row_Default` | Eyebrow | 05, 06, 19, 20, 22, 24, 33 |
| `前左` | `Brow_Squeeze_L`, `Fac_Ebr_L_Front`, `kirtF CF B03`, `outh_Pero02`, `ye_Lowereyelid` | Eyebrow | 05, 06, 19, 20, 22, 24, 33 |
| `口` | `Aa`, `Mouth_Angry04`, `fasband.Aa`, `h` | Lip | 01, 08, 12, 16, 17, 28, 29, 30, 40, 45 |
| `口_Down_Add` | `P_M_Down_Add` | Lip | 45 |
| `口_LMove_Add` | `P_M_LMove_Add` | Lip | 45 |
| `口_MidPoint_Add` | `P_M_MidPoint_Add` | Lip | 45 |
| `口_RMove_Add` | `P_M_RMove_Add` | Lip | 45 |
| `口_UpDownView_Add` | `P_M_UpDownView_Add` | Lip | 45 |
| `口_Up_Add` | `P_M_Up_Add` | Lip | 45 |
| `口zhuan右` | `fasband.S_29` | Lip | 30 |
| `口zhuan左` | `fasband.S_30` | Lip | 30 |
| `口すぼめ` | `mouthPucker` | Lip | 41, 42 |
| `口上` | `Fac_Mth_Up`, `Mouth_Up`, `Mouth_↑_NuoCha`, `P_M_Up_Add`, `fasband.P_M_Up_Add`, `口上` | Lip | 03, 08, 09, 12, 15, 18, 21, 24, 26, 28, 29, 30, 34, 35, 39, 40, 43, 46, 47, 48, 49 |
| `口下` | `Fac_Mth_Down`, `Mouth_Down`, `Mouth_↓_NuoCha`, `P_M_Down_Add`, `fasband.P_M_Down_Add`, `口下` | Lip | 03, 08, 09, 12, 15, 18, 21, 24, 26, 28, 29, 30, 34, 35, 39, 40, 43, 46, 47, 48, 49 |
| `口中無` | `P_M_MidPoint_Add` | Lip | 09 |
| `口出` | `P_M_UpDownView_Add` | Lip | 08 |
| `口前` | `P_M_UpDownView_Add` | Lip | 09 |
| `口口` | `Scda_Head01` | Lip | 28 |
| `口口右` | `Scda_Head02` | Lip | 28 |
| `口右` | `Fac_Mth_Right`, `Mouth_←_NuoCha`, `P_M_RMove_Add`, `fasband.P_M_RMove_Add`, `口右` | Lip | 03, 08, 09, 12, 15, 18, 24, 26, 28, 29, 30, 34, 35, 46, 47, 48, 49 |
| `口右斜` | `S_30` | Lip | 28, 29 |
| `口小` | `fasband.S_09` | Lip | 30 |
| `口左` | `Fac_Mth_Left`, `Mouth_→_NuoCha`, `P_M_LMove_Add`, `fasband.P_M_LMove_Add`, `口左` | Lip | 03, 08, 09, 12, 15, 18, 24, 26, 28, 29, 30, 34, 35, 46, 47, 48, 49 |
| `口左2` | `fasband.Scda_Head03` | Lip | 30 |
| `口左斜` | `S_29` | Lip | 28, 29 |
| `口平` | `S_05` | Lip | 28 |
| `口後` | `P_M_UpDownView_Add`, `fasband.P_M_UpDownView_Add` | Lip | 12, 28, 29, 30 |
| `口拡大１` | `jawOpen_Scale_01_OP` | Lip | 41, 42 |
| `口拡大２` | `jawOpen_Scale_02_OP` | Lip | 41, 42 |
| `口横広げ` | `Fac_Mth_Out`, `Fac_Mth_R_Out`, `Mouth_Line01`, `Mouth_Wide`, `Mouth_oo→_NuoCha`, `P_M_R_Add`, `VisionPelvisS R E02+`, `e_Ha`, `fasband.P_M_R_Add`, `outh_Default` | Lip | 01, 02, 03, 04, 05, 06, 08, 09, 12, 16, 17, 18, 19, 20, 21, 22, 23, 25, 28, 29, 30, 33, 34, 35, 40, 41, 42, 43, 45 |
| `口横広げ2右` | `P_M_ZR_Add`, `口横広げ2右` | Lip | 10, 11, 14, 15, 26, 39, 46, 47, 48, 49 |
| `口横広げ2左` | `P_M_ZL_Add`, `口横広げ2左` | Lip | 10, 11, 14, 15, 26, 39, 46, 47, 48, 49 |
| `口横広げ右` | `Fac_Mth_R_Out`, `P_M_R_Add`, `口横広げ右` | Lip | 10, 11, 14, 15, 18, 24, 26, 35, 39, 46, 47, 48, 49 |
| `口横広げ左` | `Fac_Mth_L_Out`, `P_M_L_Add`, `口横広げ左` | Lip | 10, 11, 14, 15, 18, 24, 26, 35, 39, 46, 47, 48, 49 |
| `口横狭げ` | `mouthPucker`, `口横狭げ` | Lip | 07, 38, 48 |
| `口横狭げ右` | `口横狭げ右` | Lip | 48 |
| `口横狭げ左` | `口横狭げ左` | Lip | 48 |
| `口横狭め` | `Fac_Mth_In`, `Fac_Mth_L_In`, `LegBagB L A02`, `Mouth_Line02`, `Mouth_oo←_NuoCha`, `P_M_Scale_Add`, `e_Jito`, `fasband.P_M_Scale_Add`, `outh_A01` | Lip | 01, 03, 05, 06, 08, 09, 12, 16, 17, 18, 19, 20, 22, 28, 29, 30, 33, 34, 35, 45 |
| `口横狭め右` | `Fac_Mth_R_In` | Lip | 18, 24, 35 |
| `口横狭め左` | `Fac_Mth_L_In` | Lip | 18, 24, 35 |
| `口横縮げ` |  | Lip | 02 |
| `口横縮小` | `P_M_Scale_Add`, `口横縮小` | Lip | 10, 11, 14, 15, 26, 46, 47, 49 |
| `口横缩げ` | `Mouth_Narrow` | Lip | 04, 21, 40, 43 |
| `口横缩げ1` | `Mouth_Pout` | Lip | 21, 43 |
| `口横缩げ2` | `Mouth_Pout` | Lip | 40 |
| `口漏斗` | `mouthFunnel` | Lip | 41, 42 |
| `口線大` | `C_M_Distant` | Lip | 09 |
| `口角上げ` | `B R A01+HemB R B03`, `Fac_Mth_LR_Up`, `Fac_Mth_L_Up`, `Fac_Mth_R_Up`, `HemB L D03`, `M_Smile_R`, `Mouth_Default`, `Mouth_Smile01`, `Mouth_oo↗_NuoCha`, `SkirtF R B03`, `fasband.M_Smile_R`, `ger31`, `ow_Shy_R` | Lip | 01, 02, 03, 05, 06, 08, 09, 12, 16, 17, 18, 19, 20, 21, 22, 23, 25, 28, 29, 30, 33, 34, 35, 40, 41, 42, 45, 50 |
| `口角上げ2右` | `口角上げ2右` | Lip | 48 |
| `口角上げ2左` | `口角上げ2左` | Lip | 48 |
| `口角上げ右` | `Fac_Mth_R_Up`, `M_Smile_R`, `口角上げ右` | Lip | 10, 11, 14, 15, 18, 24, 26, 35, 39, 46, 47, 48, 49 |
| `口角上げ左` | `Fac_Mth_L_Up`, `M_Smile_L`, `口角上げ左` | Lip | 10, 11, 14, 15, 18, 24, 26, 35, 39, 46, 47, 48, 49 |
| `口角下げ` | `B R A01+HemB R B03`, `Fac_Mth_LR_Down`, `Fac_Mth_R_Down`, `HemB L D03`, `M_Ennui_R`, `Mouth_Default`, `Mouth_Delta01`, `Mouth_Pain01`, `Mouth_oo↘_NuoCha`, `fasband.M_Ennui_R`, `ger32_e`, `ow_Shy_R` | Lip | 01, 02, 03, 04, 06, 08, 09, 12, 16, 17, 18, 19, 21, 22, 23, 25, 28, 29, 30, 33, 34, 35, 40, 41, 42, 43, 45, 50 |
| `口角下げ0` | `Mouth_Delta01` | Lip | 43 |
| `口角下げ1` | `Mouth_Delta02`, `Mouth_Pain01` | Lip | 21, 43 |
| `口角下げ2` | `Mouth_Delta03`, `Mouth_Pain02`, `Mouth_Twisted02`, `S_05` | Lip | 12, 21, 40, 43 |
| `口角下げ3` | `Mouth_Pain02`, `Mouth_Twisted01` | Lip | 21, 43 |
| `口角下げ4` | `Mouth_Pain03`, `Mouth_Twisted02` | Lip | 21, 43 |
| `口角下げ5` | `Mouth_Pain04`, `Mouth_Worry01` | Lip | 21, 43 |
| `口角下げ7` | `Mouth_Twisted02` | Lip | 43 |
| `口角下げ8` | `Mouth_Worry01` | Lip | 43 |
| `口角下げ右` | `Fac_Mth_R_Down`, `M_Ennui_R`, `口角下げ右` | Lip | 10, 11, 14, 15, 18, 24, 26, 35, 39, 46, 47, 48, 49 |
| `口角下げ左` | `Fac_Mth_L_Down`, `M_Ennui_L`, `口角下げ左` | Lip | 10, 11, 14, 15, 18, 24, 26, 35, 39, 46, 47, 48, 49 |
| `口角下げ２` | `Fac_Mth_Tsundere`, `M_Nutcracker` | Lip | 03, 09 |
| `口角前` | `C_Up_Face`, `P_M_UpDownView_Add`, `口角前` | Lip | 09, 15, 26, 39, 46, 47, 48, 49 |
| `口角平げ` | `S_05` | Lip | 09 |
| `口角後` | `P_M_ZR_Add` | Lip | 09 |
| `右もぐもぐ` |  | Lip | 01 |
| `右上` | `EB_UD_R`, `右上` | Eyebrow | 07, 31, 38 |
| `右口横広げ` | `P_M_R_Add`, `fasband.P_M_R_Add`, `h` | Lip | 01, 08, 12, 16, 17, 28, 29, 30, 45 |
| `右口角上げ` | `M_Smile_R`, `fasband.M_Smile_R`, `h` | Lip | 01, 08, 12, 16, 17, 28, 29, 30, 45 |
| `右口角上げ2` | `P_M_ZR_Add`, `fasband.P_M_ZR_Add` | Lip | 08, 12, 16, 17, 28, 29, 30, 45 |
| `右口角下げ` | `M_Ennui_R`, `Mesh`, `fasband.M_Ennui_R` | Lip | 01, 08, 12, 16, 17, 28, 29, 30, 45 |
| `右口角後` | `esh` | Lip | 01 |
| `右眉上下` | `EB_UD_R` | Eyebrow | 41, 42 |
| `右眉不機嫌` | `iMd10011_` | Eyebrow | 01 |
| `唇中` | `P_M_MidPoint_Add`, `唇中` | Lip | 15, 26, 46, 48, 49 |
| `唇出` |  | Lip | 01 |
| `喜び` | `A03+VisionPelvisS L `, `Eye_Doubt01`, `outh_Pero01`, `row_Shy_L` | Eye | 05, 06, 20, 22, 40 |
| `喜び2` | `Eye_Doubt02` | Eye | 40 |
| `喜び口閉` | `jawOpen_Happy_01_CLO` | Lip | 41, 42 |
| `噛み口閉` | `jawOpen_Chew_01_CLO` | Lip | 41, 42 |
| `噛み口開` | `jawOpen_Chew_01_OP` | Lip | 41, 42 |
| `困る` | `1`, `B_Sad`, `Brow_Shy`, `Brow_Trouble_L`, `EB_Sad_01`, `EB_困扰_NuoCha`, `Fac_Ebr_Sorrow`, `fasband.B_Sad`, `iMd10011_`, `kirtS R B02`, `outh_A01`, `sadness `, `st R A0`, `ue01`, `ye_WinkA_R`, `困る` | Eyebrow | 01, 02, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 40, 41, 42, 43, 45, 46, 47, 48, 49, 50 |
| `困る2` | `ger3` | Eyebrow | 23 |
| `困るL` | `B_Sad`, `fasband.B_Sad`, `iMd10011_` | Eyebrow | 01, 08, 12, 16, 17, 26, 28, 29, 30, 45 |
| `困るR` | `B_Sad`, `fasband.B_Sad`, `iMd10011_` | Eyebrow | 01, 08, 12, 16, 17, 26, 28, 29, 30, 45 |
| `困る右` | `B_Sad`, `Brow_Trouble_R`, `kirtS R B03`, `outh_Open01`, `ye_WinkB_L`, `困る右` | Eyebrow | 05, 06, 10, 11, 14, 15, 19, 20, 22, 33, 46, 48, 49 |
| `困る左` | `B_Sad`, `Brow_Trouble_L`, `kirtS R B02`, `outh_A01`, `ue01`, `ye_WinkA_R`, `困る左` | Eyebrow | 05, 06, 10, 11, 14, 15, 19, 20, 22, 33, 46, 48, 49 |
| `困る１` | `S_02` | Eyebrow | 47 |
| `垂れ目` | `E_Sad`, `fasband.E_Sad` | Eye | 08, 12, 16, 17, 28, 29, 30, 45 |
| `垂れ目2` | `S_15` | Eye | 28 |
| `大口` | `Mouth_Max` | Lip | 40 |
| `左い` | `S_12` | Lip | 28 |
| `左いい` | `fasband.Scda_Head02` | Lip | 30 |
| `左もぐもぐ` |  | Lip | 01 |
| `左上` | `EB_UD_L`, `左上` | Eyebrow | 07, 31, 38 |
| `左口横広げ` | `P_M_L_Add`, `fasband.P_M_L_Add` | Lip | 01, 08, 12, 16, 17, 28, 29, 30, 45 |
| `左口角上げ` | `M_Smile_L`, `fasband.M_Smile_L`, `h` | Lip | 01, 08, 12, 16, 17, 28, 29, 30, 45 |
| `左口角上げ2` | `P_M_ZL_Add`, `fasband.P_M_ZL_Add` | Lip | 08, 12, 16, 17, 28, 29, 30, 45 |
| `左口角下げ` | `M_Ennui_L`, `fasband.M_Ennui_L` | Lip | 01, 08, 12, 16, 17, 28, 29, 30, 45 |
| `左口角後` | `h` | Lip | 01 |
| `左眉上下` | `EB_UD_L` | Eyebrow | 41, 42 |
| `左眉下` | `S_10` | Eyebrow | 12 |
| `左眉不機嫌` | `iMd10011_` | Eyebrow | 01 |
| `平` |  | Lip | 27 |
| `平目` | `S_17` | Eye | 28 |
| `平行` | `B_Flat`, `fasband.B_Flat`, `平行` | Eyebrow | 08, 10, 11, 12, 14, 15, 16, 17, 26, 28, 29, 30, 39, 45, 46, 47, 48, 49 |
| `平行L` | `B_Flat` | Eyebrow | 26 |
| `平行R` | `B_Flat` | Eyebrow | 26 |
| `平行右` | `B_Flat`, `平行右` | Eyebrow | 10, 11, 14, 15, 39, 46, 48, 49 |
| `平行左` | `B_Flat`, `平行左` | Eyebrow | 10, 11, 14, 15, 39, 46, 48, 49 |
| `心配する` | `Mouth_Worry01` | Lip | 40 |
| `心配する2` | `Mouth_Worry02` | Lip | 40 |
| `怒った` | `Mouth_Angry02` | Lip | 40 |
| `怒った2` | `Mouth_Angry03` | Lip | 40 |
| `怒り` | `B_Anger`, `Brow_Angry`, `Brow_Angry_L`, `EB_Angry_01`, `EB_Angry_NuoCha`, `Fac_Ebr_Angry`, `anger`, `fasband.B_Anger`, `ger1`, `iMd10011_`, `kirtF R B02`, `outh_Angry01`, `ye_WinkC_R`, `怒り` | Eyebrow | 01, 02, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48, 49, 50 |
| `怒りL` | `B_Anger`, `fasband.B_Anger`, `iMd10011_` | Eyebrow | 01, 08, 12, 16, 17, 26, 28, 29, 30, 45 |
| `怒りR` | `B_Anger`, `fasband.B_Anger`, `iMd10011_` | Eyebrow | 01, 08, 12, 16, 17, 26, 28, 29, 30, 45 |
| `怒り口閉` | `jawOpen_Angry_01_CLO` | Lip | 41, 42 |
| `怒り口開` | `jawOpen_Angry_01_OP` | Lip | 41, 42 |
| `怒り右` | `B_AH_R`, `Brow_Angry_R`, `Brow_Doubt`, `Fac_Ebr_R_Angry`, `kirtF R B03`, `outh_Angry02`, `ye_Ha`, `怒り右` | Eyebrow | 05, 06, 10, 11, 14, 15, 18, 19, 20, 22, 24, 33, 35, 39, 40, 46, 48, 49 |
| `怒り左` | `B_AH_L`, `Brow_Angry_L`, `Fac_Ebr_L_Angry`, `kirtF R B02`, `outh_Angry01`, `ye_WinkC_R`, `怒り左` | Eyebrow | 05, 06, 10, 11, 14, 15, 19, 20, 22, 24, 33, 35, 39, 46, 48, 49 |
| `怒り目` | `A04Bip001 L Calf`, `E_Anger`, `Eye_Hostility`, `Eye_认真_NuoCha`, `Fac_Eye_Angry`, `outh_Pero02`, `ow_Smily_L`, `row_Shy_R` | Eye, Eyebrow | 03, 05, 06, 09, 18, 19, 20, 22, 24, 33, 34, 35, 50 |
| `怒り目閉` | `EL_Angry_01_CLO` | Eye | 41, 42 |
| `怒り目２` | `Fac_Eye_MidDown` | Eye | 03, 18, 24, 35 |
| `怒り２` | `B_AH_L` | Eyebrow | 26 |
| `怒り２L` | `B_AH_L` | Eyebrow | 26 |
| `怒り２R` | `B_AH_R` | Eyebrow | 26 |
| `怒目` | `Eye_Angry03` | Eye | 40 |
| `怒目2` | `Eye_Angry04` | Eye | 40 |
| `怪訝右` | `B_AH_R`, `fasband.B_AH_R` | Eyebrow | 08, 12, 16, 17, 28, 29, 30, 45 |
| `怪訝左` | `B_AH_L`, `fasband.B_AH_L` | Eyebrow | 08, 12, 16, 17, 28, 29, 30, 45 |
| `恐ろしい子！` | `恐ろしい子！` | Eye | 02, 04, 10, 11, 14, 15, 21, 26, 43, 46, 48, 49, 50 |
| `恐ろしい子！L` | `恐ろしい子！` | Eye | 26 |
| `恐ろしい子！R` | `恐ろしい子！` | Eye | 26 |
| `恐ろしい子！右` |  | Eye | 10, 11, 14, 15, 46, 49 |
| `恐ろしい子！左` |  | Eye | 10, 11, 14, 15, 46, 49 |
| `恥ずかしい` | `B_Flat`, `Brow_Shy_L`, `owknotF R A61` | Eyebrow | 09, 19, 33 |
| `恥ずかしい右` | `Brow_Shy_R`, `owknotF R A64` | Eyebrow | 19, 33 |
| `恥ずかしい左` | `Brow_Shy_L`, `owknotF R A61` | Eyebrow | 19, 33 |
| `悪い口閉` | `jawOpen_Evil_01_CLO` | Lip | 41, 42 |
| `悪い目閉` | `EL_Evil_01_CLO` | Eye | 41, 42 |
| `悲しい` | `Brow_Trouble` | Eyebrow | 18, 40 |
| `悲しい目` | `E_Sad`, `悲しい目` | Eye | 10, 11, 14, 15, 26, 39, 43, 46, 47, 48, 49 |
| `悲しい目L` | `E_Sad` | Eye | 26 |
| `悲しい目R` | `E_Sad` | Eye | 26 |
| `悲しい目右` | `E_Sad`, `悲しい目右` | Eye | 10, 11, 14, 15, 39, 46, 48, 49 |
| `悲しい目左` | `E_Sad`, `悲しい目左` | Eye | 10, 11, 14, 15, 39, 46, 48, 49 |
| `悲しみ` | `iMd10011_` | Eye | 01 |
| `悲しみ口閉` | `jawOpen_Sad_01_CLO` | Lip | 41, 42 |
| `悲しみ口開` | `jawOpen_Sad_01_OP` | Lip | 41, 42 |
| `悲しみ目閉` | `EL_Sad_01_CLO` | Eye | 41, 42 |
| `悲しむ` | `E_Sad`, `Eye_Wail`, `Eye_困扰_NuoCha`, `Fac_Eye_Sad`, `ow_Trouble_R` | Eye | 03, 09, 18, 19, 24, 33, 34, 35 |
| `慈愛` | `Eye_Gentle01` | Eye | 40 |
| `慈愛2` | `Eye_Gentle02` | Eye | 40 |
| `手前` | `Brow_Gentle` | Eyebrow | 18, 40 |
| `手前2` | `Brow_Surprise` | Eyebrow | 40 |
| `挑発する` | `B_AH_L` | Eyebrow | 09 |
| `挑発する右` | `B_AH_R` | Eyebrow | 09 |
| `星目` | `星目` | Eye | 02, 06, 08, 12, 14, 16, 17, 20, 22, 23, 28, 29, 30, 45 |
| `星目2` | `星目2` | Eye | 14 |
| `歯上げ` | `S_24` | Lip | 29 |
| `歯下げ` | `S_25` | Lip | 29 |
| `歯消` | `S_08` | Lip | 09 |
| `歯無し上` |  | Lip | 02 |
| `歯無し下` |  | Lip | 02 |
| `疑い口閉` | `jawOpen_Doubt_01_CLO` | Lip | 41, 42 |
| `疑い口開` | `jawOpen_Doubt_01_OP` | Lip | 41, 42 |
| `疑い目閉` | `EL_Doubt_01_CLO` | Eye | 41, 42 |
| `疑い目開` | `EL_Doubt_01_OP` | Eye | 41, 42 |
| `疑惑 右` | `B_AH_L` | Eyebrow | 47 |
| `疑惑 左` | `B_AH_R` | Eyebrow | 47 |
| `疲れ口閉` | `jawOpen_Tired_01_CLO` | Lip | 41, 42 |
| `疲れ口開` | `jawOpen_Tired_01_OP` | Lip | 41, 42 |
| `疲れ目閉` | `EL_Tired_01_CLO` | Eye | 41, 42 |
| `痛み` | `Mouth_Pain02` | Lip | 40 |
| `痛み2` | `Mouth_Pain03` | Lip | 40 |
| `痛み3` | `Mouth_Pain04` | Lip | 40 |
| `目を細める` | `EL_Sad_01_OP`, `目を細める` | Eye | 07, 31, 38, 41, 42 |
| `目上` | `EL_Up`, `Pupil_Up` | Eye | 09, 41, 42, 47 |
| `目下` | `EL_Down`, `Pupil_Down` | Eye | 09, 41, 42, 47 |
| `目右` | `Pupil_R` | Eye | 09, 47 |
| `目大` | `fasband.S_03` | Eye | 30 |
| `目尻上` | `EL_CornerUp` | Eye | 41, 42 |
| `目尻下` | `EL_CornerDown` | Eye | 41, 42 |
| `目左` | `Pupil_L` | Eye | 09, 47 |
| `目星` |  | Eye | 05 |
| `眉 內` | `S_10` | Eyebrow | 45 |
| `眉びっくり` | `EB_Surprised_01` | Eyebrow | 41, 42 |
| `眉下2` | `S_08` | Eyebrow | 12 |
| `眉喜び` | `EB_happy_01` | Eyebrow | 41, 42 |
| `眉回転右` | `EB_Rotate_02` | Eyebrow | 41, 42 |
| `眉回転左` | `EB_Rotate_01` | Eyebrow | 41, 42 |
| `眉後` | `S_10` | Eyebrow | 09 |
| `眉後2` | `fasband.S_10` | Eyebrow | 30 |
| `眉悪い` | `EB_Evil_01` | Eyebrow | 41, 42 |
| `眉狭` | `B_Inside_Add` | Eyebrow | 09 |
| `眉疑い` | `EB_Doubt_01` | Eyebrow | 41, 42 |
| `眉疲れ` | `EB_Tired_01` | Eyebrow | 41, 42 |
| `眉細` | `S_10` | Eyebrow | 28 |
| `眉考え` | `EB_Thinking_01` | Eyebrow | 41, 42 |
| `眉軽蔑` | `EB_Despise_01` | Eyebrow | 41, 42 |
| `眉頭右` |  | Eyebrow | 41, 42 |
| `眉頭左` |  | Eyebrow | 41, 42 |
| `真剣目` | `EL_Serious_01_OP` | Eye | 41, 42 |
| `真剣目閉` | `EL_Serious_01_CLO` | Eye | 41, 42 |
| `真面目` | `B_Sad`, `Brow_Down`, `Brow_Trouble_L`, `EB_Serious_01`, `EB_困扰_NuoCha`, `Fac_Ebr_Serious`, `S_16`, `fasband.S_02`, `ger12`, `kirtS R B02`, `outh_Default`, `serious`, `ye_Jito`, `真面目` | Eyebrow | 01, 02, 04, 05, 06, 07, 08, 09, 12, 16, 17, 18, 19, 20, 21, 22, 23, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 40, 41, 42, 43, 45, 48 |
| `真面目L` | `S_16`, `fasband.S_02` | Eyebrow | 01, 08, 12, 16, 17, 28, 29, 30, 45 |
| `真面目R` | `S_16`, `fasband.S_02` | Eyebrow | 01, 08, 12, 16, 17, 28, 29, 30, 45 |
| `真面目右` | `outh_Default`, `ye_Wail`, `真面目右` | Eyebrow | 05, 06, 20, 22, 48 |
| `真面目左` | `outh_Default`, `ye_Jito`, `真面目左` | Eyebrow | 05, 06, 20, 22, 48 |
| `眼角down` | `outh_BigTongue01` | Eye | 05 |
| `眼角up` | `outh_Line02` | Eye | 05 |
| `眼角上` | `Eye_WUp`, `ow_Angry_L`, `row_Up_R` | Eye | 06, 19, 20, 22, 33 |
| `眼角下` | `Eye_WDown`, `Eye_↙↘_NuoCha`, `Fac_Eye_MidUp`, `ow_Angry_R`, `row_Down_L` | Eye | 03, 06, 18, 19, 20, 22, 24, 33, 34, 35 |
| `睫上` | `Eye_LashesUP` | Eye | 33 |
| `瞳小` | `Pupil_Scale`, `esh`, `eye_SF`, `fasband2.Pupil_Scale`, `瞳小` | Eye | 01, 02, 04, 07, 08, 09, 10, 11, 12, 14, 15, 16, 17, 19, 21, 25, 26, 28, 29, 30, 31, 32, 38, 39, 41, 42, 43, 45, 46, 47, 48, 49, 50 |
| `瞳小L` | `Pupil_Scale`, `esh`, `fasband2.Pupil_Scale`, `瞳小` | Eye | 01, 08, 12, 16, 17, 26, 28, 29, 30, 45 |
| `瞳小R` | `Pupil_Scale`, `esh`, `fasband2.Pupil_Scale`, `瞳小` | Eye | 01, 08, 12, 16, 17, 26, 28, 29, 30, 45 |
| `瞳小右` | `Pupil_Scale`, `瞳小右` | Eye | 10, 11, 14, 15, 39, 46, 48, 49 |
| `瞳小左` | `Pupil_Scale`, `瞳小左` | Eye | 10, 11, 14, 15, 39, 46, 48, 49 |
| `瞳縦潰れ` |  | Eye | 23, 50 |
| `瞳縦潰れ2` | `1` | Eye | 23 |
| `笑い` | `EL_Smile_01_CLO`, `EYE_Wink_L_NuoCha`, `E_Smile_L`, `E_Smile_R`, `Eye_Close02`, `Eye_WinkA_L`, `Fac_Eye_L_Wink`, `Fac_Eye_R_Wink`, `Fac_Eye_Smile`, `fasband.E_Smile_R`, `outh_BigTongue01`, `outh_Smile02`, `p001 L Toe0`, `smile`, `笑い` | Eye, Eyebrow | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40, 41, 42, 43, 45, 46, 48, 49, 50 |
| `笑い1` | `Eye_Close03` | Eye | 21 |
| `笑い2` | `Eye_Close03` | Eye | 40 |
| `笑い目` | `E_Blephar`, `fasband.E_Blephar`, `笑い目` | Eye | 08, 10, 11, 12, 14, 15, 16, 17, 26, 28, 29, 30, 45, 46, 47, 48, 49 |
| `笑い目+右` | `笑い目+右` | Eye | 48 |
| `笑い目+左` | `笑い目+左` | Eye | 48 |
| `笑い目L` | `E_Blephar` | Eye | 26 |
| `笑い目R` | `E_Blephar` | Eye | 26 |
| `笑い目右` | `E_Blephar`, `笑い目右` | Eye | 10, 11, 14, 15, 46, 48, 49 |
| `笑い目左` | `E_Blephar`, `笑い目左` | Eye | 10, 11, 14, 15, 46, 48, 49 |
| `笑う１` | `Fac_Mth_Laugh1` | Lip | 35 |
| `笑う２` | `Fac_Mth_Laugh2` | Lip | 24 |
| `笑顔口閉` | `jawOpen_Smile_01_CLO` | Lip | 41, 42 |
| `考え目閉` | `EL_Thinking_01_CLO` | Eye | 41, 42 |
| `考え目開` | `EL_Thinking_01_OP` | Eye | 41, 42 |
| `脱外套` |  | Eye | 50 |
| `舌下` | `S_26`, `S_27` | Lip | 28, 29 |
| `舌下2` | `S_27` | Lip | 29 |
| `舌小` | `S_26` | Lip | 28 |
| `舌広げ` | `LegBagB L A03`, `Mouth_BigTongue01`, `Nub`, `e_Wail`, `outh_Open01` | Lip | 05, 06, 19, 20, 22, 33 |
| `視線上` | `look_U` | Eye | 41, 42 |
| `視線下` | `look_D` | Eye | 41, 42 |
| `視線右` | `look_R` | Eye | 41, 42 |
| `視線右上` | `look_RU` | Eye | 41, 42 |
| `視線右下` | `look_RD` | Eye | 41, 42 |
| `視線左` | `look_L` | Eye | 41, 42 |
| `視線左上` | `look_LU` | Eye | 41, 42 |
| `視線左下` | `look_LD` | Eye | 41, 42 |
| `軽蔑口閉` | `jawOpen_Despise_01_CLO` | Lip | 41, 42 |
| `軽蔑口開` | `jawOpen_Despise_01_OP` | Lip | 41, 42 |
| `軽蔑目` | `EL_Despise_01_OP` | Eye | 41, 42 |
| `軽蔑目閉` | `EL_Despise_01_CLO` | Eye | 41, 42 |
| `頬を膨` | `頬を膨` | Lip | 48 |
| `驚かす` | `Eye_Surprise02` | Eye | 40 |
| `驚き口閉` | `jawOpen_Surprised_01_CLO` | Lip | 41, 42 |
| `驚き口開` | `jawOpen_Surprised_01_OP` | Lip | 41, 42 |
| `鼻_Down` | `P_Nose_Down` | Lip | 45 |
| `鼻_Nose_Up` | `P_Nose_Up` | Lip | 45 |
| `鼻上` | `P_Nose_Up`, `fasband.P_Nose_Up`, `鼻上` | Lip | 01, 26, 29, 30, 39, 46, 47, 48, 49 |
| `鼻下` | `P_Nose_Down`, `fasband.P_Nose_Down`, `鼻下` | Lip | 26, 29, 30, 39, 46, 47, 48, 49 |
| `齒上` | `Fac_Tooth_Up` | Lip | 18 |
| `齒下` | `Fac_Tooth_Down` | Lip | 18 |
| `齶上` | `C_Up_Face`, `齶上` | Lip | 15, 26, 46, 47, 48, 49 |
| `齶前` | `C_Down_Face`, `齶前` | Lip | 15, 26, 39, 46, 47, 48, 49 |
| `齶右` | `C_ZR_Face`, `齶右` | Lip | 15, 26, 46, 47, 48, 49 |
| `齶左` | `C_ZL_Face`, `齶左` | Lip | 15, 26, 46, 47, 48, 49 |
| `ｳｨﾝｸ２右` | `E_Close`, `E_Close_R`, `Eye_Close01`, `Fac_Eye_Close`, `biyan_R`, `fasband.E_Close`, `iMd10011_`, `ｳｨﾝｸ２右` | Eye | 01, 04, 07, 08, 12, 16, 17, 18, 21, 25, 28, 29, 30, 31, 32, 38, 40, 41, 42, 43, 45 |
| `ｷﾘｯ` | `EL_Angry_01_OP`, `E_Anger`, `Eye_Angry01`, `fasband.E_Anger`, `iMd10011_`, `ｷﾘｯ` | Eye | 01, 02, 04, 07, 08, 12, 16, 17, 21, 28, 29, 30, 31, 38, 40, 41, 42, 43, 45 |
| `ｷﾘｯ1` | `Eye_Angry02` | Eye | 21 |
| `ｷﾘｯ2` | `EL_Evil_01_OP`, `Eye_Angry02`, `Eye_Doubt01`, `fasband.Scda_Head01`, `ｷﾘｯ2` | Eye, Lip | 07, 21, 30, 31, 38, 40, 41, 42 |
| `ｷﾘｯ3` | `Eye_Doubt02` | Eye | 21 |

## 4. Complete per-model morph inventories

Category meanings: Eyebrow = 1, Eye = 2, Lip = 3, System = 0, Other = 4. Categories are author-provided metadata, not an independently verified classification. Group morphs combine other morphs; Vertex/Bone/UV/Material describe the deformation mechanism, not necessarily the body region.

“App channel” marks the selected original-name match for each channel. — means this morph is not selected by the current adapter; it may still be useful for future facial animation. Each table includes all categories to preserve completeness.

<a id="model-01"></a>
### 01. Aalto

- Format: PMX
- Asset path: `ww/chars/Aalto/Aalto.pmx`
- Embedded name: `鳴潮_秋水`
- Embedded English name: —
- Cache file: `13930c689c9e32c9400697e9c59e87a3aca3476f180d8736f1a5a1494bb87490.asset`
- Morph counts: Eye: 25, Eyebrow: 22, Lip: 37, Other: 21; total: 105.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `真面目` | — | Eyebrow | Vertex | — |
| 1 | `真面目L` | — | Eyebrow | Vertex | — |
| 2 | `真面目R` | — | Eyebrow | Vertex | — |
| 3 | `怒り` | `iMd10011_` | Eyebrow | Vertex | angry |
| 4 | `怒りL` | `iMd10011_` | Eyebrow | Vertex | — |
| 5 | `怒りR` | `iMd10011_` | Eyebrow | Vertex | — |
| 6 | `にこり` | `iMd10011_` | Eyebrow | Vertex | — |
| 7 | `にこりL` | `iMd10011_` | Eyebrow | Vertex | — |
| 8 | `にこりR` | `iMd10011_` | Eyebrow | Vertex | — |
| 9 | `にこり2` | `iMd10011_` | Eyebrow | Vertex | — |
| 10 | `困る` | `iMd10011_` | Eyebrow | Vertex | sad |
| 11 | `困るL` | `iMd10011_` | Eyebrow | Vertex | — |
| 12 | `困るR` | `iMd10011_` | Eyebrow | Vertex | — |
| 13 | `にこり3` | `iMd10011_` | Eyebrow | Vertex | — |
| 14 | `左眉不機嫌` | `iMd10011_` | Eyebrow | Vertex | — |
| 15 | `右眉不機嫌` | `iMd10011_` | Eyebrow | Vertex | — |
| 16 | `上` | `iMd10011_` | Eyebrow | Vertex | — |
| 17 | `上L` | `iMd10011_` | Eyebrow | Vertex | — |
| 18 | `上R` | `iMd10011_` | Eyebrow | Vertex | — |
| 19 | `下` | `iMd10011_` | Eyebrow | Vertex | — |
| 20 | `下L` | `iMd10011_` | Eyebrow | Vertex | — |
| 21 | `下R` | `iMd10011_` | Eyebrow | Vertex | — |
| 22 | `まばたき` | `iMd10011_` | Eye | Vertex | blink |
| 23 | `笑い` | — | Eye | Vertex | smileEyes |
| 24 | `ウィンク` | `iMd10011_` | Eye | Vertex | — |
| 25 | `ウィンク右` | `iMd10011_` | Eye | Vertex | — |
| 26 | `ウィンク２` | `iMd10011_` | Eye | Vertex | — |
| 27 | `ｳｨﾝｸ２右` | `iMd10011_` | Eye | Vertex | — |
| 28 | `はちゅ目` | — | Eye | Vertex | — |
| 29 | `はぅ` | — | Eye | Vertex | — |
| 30 | `なごみ` | — | Eye | Vertex | — |
| 31 | `なごみL` | — | Eye | Vertex | — |
| 32 | `なごみR` | — | Eye | Vertex | — |
| 33 | `ｷﾘｯ` | `iMd10011_` | Eye | Vertex | — |
| 34 | `悲しみ` | `iMd10011_` | Eye | Vertex | — |
| 35 | `じと目2` | `iMd10011_` | Eye | Vertex | — |
| 36 | `じと目` | `iMd10011_` | Eye | Vertex | — |
| 37 | `じと目L` | `iMd10011_` | Eye | Vertex | — |
| 38 | `じと目R` | `iMd10011_` | Eye | Vertex | — |
| 39 | `びっくり` | `iMd10011_` | Eye | Vertex | surprised |
| 40 | `up` | — | Eye | Vertex | — |
| 41 | `down` | `esh` | Eye | Vertex | — |
| 42 | `right` | `esh` | Eye | Vertex | — |
| 43 | `left` | `esh` | Eye | Vertex | — |
| 44 | `瞳小` | `esh` | Eye | Vertex | — |
| 45 | `瞳小L` | `esh` | Eye | Vertex | — |
| 46 | `瞳小R` | `esh` | Eye | Vertex | — |
| 47 | `あ` | — | Lip | Vertex | a |
| 48 | `い` | `iMd10011_` | Lip | Vertex | i |
| 49 | `う` | `iMd10011_` | Lip | Vertex | u |
| 50 | `え` | `iMd10011_` | Lip | Vertex | e |
| 51 | `お` | `iMd10011_` | Lip | Vertex | o |
| 52 | `ワ` | `iMd10011_` | Lip | Vertex | — |
| 53 | `▲` | `iMd10011_` | Lip | Vertex | — |
| 54 | `え2` | — | Lip | Vertex | — |
| 55 | `い2` | — | Lip | Vertex | — |
| 56 | `えー` | — | Lip | Vertex | — |
| 57 | `いい` | `sh` | Lip | Vertex | — |
| 58 | `つ` | `Mesh` | Lip | Vertex | — |
| 59 | `口` | `h` | Lip | Vertex | — |
| 60 | `お2` | `esh` | Lip | Vertex | — |
| 61 | `д` | `esh` | Lip | Vertex | — |
| 62 | `M口` | `h` | Lip | Vertex | — |
| 63 | `にやり` | — | Lip | Vertex | smile |
| 64 | `∧` | — | Lip | Vertex | — |
| 65 | `ω` | — | Lip | Vertex | — |
| 66 | `ぺろっ ` | — | Lip | Vertex | — |
| 67 | `口角上げ` | — | Lip | Vertex | — |
| 68 | `口角下げ` | — | Lip | Vertex | — |
| 69 | `口横広げ` | — | Lip | Vertex | — |
| 70 | `口横狭め` | — | Lip | Vertex | — |
| 71 | `右口角上げ` | `h` | Lip | Vertex | — |
| 72 | `左口角上げ` | `h` | Lip | Vertex | — |
| 73 | `右口角下げ` | `Mesh` | Lip | Vertex | — |
| 74 | `左口角下げ` | — | Lip | Vertex | — |
| 75 | `左口横広げ` | — | Lip | Vertex | — |
| 76 | `右口横広げ` | `h` | Lip | Vertex | — |
| 77 | `右口角後` | `esh` | Lip | Vertex | — |
| 78 | `左口角後` | `h` | Lip | Vertex | — |
| 79 | `右もぐもぐ` | — | Lip | Vertex | — |
| 80 | `左もぐもぐ` | — | Lip | Vertex | — |
| 81 | `鼻上` | — | Lip | Vertex | — |
| 82 | `唇出` | — | Lip | Vertex | — |
| 83 | `lip thick` | — | Lip | Vertex | — |
| 84 | `照れ` | — | Other | Vertex | — |
| 85 | `照れ2` | — | Other | Vertex | — |
| 86 | `eye al` | — | Other | Material | — |
| 87 | `eye hi al` | — | Other | Material | — |
| 88 | `eye hi off` | — | Other | Material | — |
| 89 | `星目` | — | Other | Vertex | — |
| 90 | `はぁと` | — | Other | Vertex | — |
| 91 | `見開く` | — | Other | Group | — |
| 92 | `にこりB` | — | Other | Group | — |
| 93 | `困るB` | — | Other | Group | — |
| 94 | `怒りB` | — | Other | Group | — |
| 95 | `にこりA` | — | Other | Group | — |
| 96 | `真面目A` | — | Other | Group | — |
| 97 | `困るA` | — | Other | Group | — |
| 98 | `怒りA` | — | Other | Group | — |
| 99 | `笑いA` | — | Other | Group | — |
| 100 | `まばたきA` | — | Other | Group | — |
| 101 | `寄り目` | — | Other | Bone | — |
| 102 | `+目下` | — | Other | Bone | — |
| 103 | `+目上` | — | Other | Bone | — |
| 104 | `xing al` | — | Other | Material | — |

<a id="model-02"></a>
### 02. Akane

- Format: PMX
- Asset path: `nte/chars/Akane Rin/Akane Rin_old/Akane Rin.pmx`
- Embedded name: `Akane`
- Embedded English name: `Akane`
- Cache file: `26571d35bf9fce54b1191cb10bce84861056b7560832b565717075ed929c1743.asset`
- Morph counts: Eye: 16, Eyebrow: 6, Lip: 14, Other: 5; total: 41.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `まばたき` | — | Eye | Vertex | blink |
| 1 | `ウィンク２右` | — | Eye | Vertex | — |
| 2 | `ウィンク２` | — | Eye | Vertex | — |
| 3 | `笑い` | — | Eye | Vertex | smileEyes |
| 4 | `ウィンク右` | — | Eye | Vertex | — |
| 5 | `ウィンク` | — | Eye | Vertex | — |
| 6 | `びっくり` | — | Eye | Vertex | surprised |
| 7 | `じと目` | — | Eye | Vertex | — |
| 8 | `ｷﾘｯ` | — | Eye | Vertex | — |
| 9 | `なごみ` | — | Eye | Vertex | — |
| 10 | `瞳小` | — | Eye | Vertex | — |
| 11 | `恐ろしい子！` | — | Eye | Vertex | — |
| 12 | `はぅ` | — | Eye | Vertex | — |
| 13 | `はちゅ目` | — | Eye | Vertex | — |
| 14 | `星目` | — | Eye | Vertex | — |
| 15 | `はぁと` | — | Eye | Vertex | — |
| 16 | `あ` | — | Lip | Vertex | a |
| 17 | `い` | — | Lip | Vertex | i |
| 18 | `う` | — | Lip | Vertex | u |
| 19 | `え` | — | Lip | Vertex | e |
| 20 | `お` | — | Lip | Vertex | o |
| 21 | `あ２` | — | Lip | Vertex | — |
| 22 | `にやり` | — | Lip | Vertex | smile |
| 23 | `ぺろっ` | — | Lip | Vertex | — |
| 24 | `歯無し上` | — | Lip | Vertex | — |
| 25 | `歯無し下` | — | Lip | Vertex | — |
| 26 | `口角上げ` | — | Lip | Vertex | — |
| 27 | `口角下げ` | — | Lip | Vertex | — |
| 28 | `口横縮げ` | — | Lip | Vertex | — |
| 29 | `口横広げ` | — | Lip | Vertex | — |
| 30 | `真面目` | — | Eyebrow | Vertex | — |
| 31 | `困る` | — | Eyebrow | Vertex | sad |
| 32 | `にこり` | — | Eyebrow | Vertex | — |
| 33 | `怒り` | — | Eyebrow | Vertex | angry |
| 34 | `上` | — | Eyebrow | Vertex | — |
| 35 | `下` | — | Eyebrow | Vertex | — |
| 36 | `驚く` | — | Other | Vertex | — |
| 37 | `汗` | — | Other | Vertex | — |
| 38 | `怒` | — | Other | Vertex | — |
| 39 | `汗2` | — | Other | Vertex | — |
| 40 | `Kira` | — | Other | Vertex | — |

<a id="model-03"></a>
### 03. Alice Thymefield

- Format: PMX
- Asset path: `zzz/chars/Alice Thymefield/Alice_skin/Alice.pmx`
- Embedded name: `Alice_Swimwear`
- Embedded English name: `Alice_Swimwear`
- Cache file: `d21bfddba51f8be6a1eaf2d1c2b3642827f72a0b0daa109c39aeb5b20e09652a.asset`
- Morph counts: Eye: 15, Lip: 25; total: 40.
- Unmatched app channels: `sad`, `angry`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `まばたき` | `Fac_Eye_Close` | Eye | Vertex | blink |
| 1 | `笑い` | `Fac_Eye_L_Wink` | Eye | Vertex | smileEyes |
| 2 | `ウィンク` | `Fac_Eye_L_Wink` | Eye | Vertex | — |
| 3 | `ウィンク右` | `Fac_Eye_R_Wink` | Eye | Vertex | — |
| 4 | `ウィンク２` | `Fac_Eye_Close` | Eye | Vertex | — |
| 5 | `ウィンク２右` | `Fac_Eye_Close` | Eye | Vertex | — |
| 6 | `びっくり` | `Fac_Eye_R_Open` | Eye | Vertex | surprised |
| 7 | `びっくり右` | `Fac_Eye_R_Open` | Eye | Vertex | — |
| 8 | `びっくり左` | `Fac_Eye_L_Open` | Eye | Vertex | — |
| 9 | `じと目` | `Fac_Eye_HalfClose` | Eye | Vertex | — |
| 10 | `怒り目２` | `Fac_Eye_MidDown` | Eye | Vertex | — |
| 11 | `怒り目` | `Fac_Eye_Angry` | Eye | Vertex | — |
| 12 | `悲しむ` | `Fac_Eye_Sad` | Eye | Vertex | — |
| 13 | `眼角下` | `Fac_Eye_MidUp` | Eye | Vertex | — |
| 14 | `下眼上` | `Fac_Eye_LowlidUp` | Eye | Vertex | — |
| 15 | `あ` | `Fac_Mth_Aa1` | Lip | Vertex | a |
| 16 | `い` | `Fac_Mth_Laugh2` | Lip | Vertex | i |
| 17 | `う` | `Fac_Mth_Uu` | Lip | Vertex | u |
| 18 | `え` | `Fac_Mth_Aa2` | Lip | Vertex | e |
| 19 | `お` | `Fac_Mth_Oo` | Lip | Vertex | o |
| 20 | `ワ` | `Fac_Mth_AaTalk` | Lip | Vertex | — |
| 21 | `□` | `Fac_Mth_AaShout` | Lip | Vertex | — |
| 22 | `あ２` | `Fac_Mth_Aa1` | Lip | Vertex | — |
| 23 | `い２` | `Fac_Mth_Ii` | Lip | Vertex | — |
| 24 | `え２` | `Fac_Mth_Ee` | Lip | Vertex | — |
| 25 | `お２` | `Fac_Mth_UuOo` | Lip | Vertex | — |
| 26 | `ワ２` | `Fac_Mth_Laugh1` | Lip | Vertex | — |
| 27 | `ワ３` | `Fac_Mth_Laugh3` | Lip | Vertex | — |
| 28 | `▲` | `Fac_Mth_Triangle` | Lip | Vertex | — |
| 29 | `にやり` | `Fac_Mth_R_Up` | Lip | Vertex | smile |
| 30 | `にやり２` | `Fac_Mth_R_Up` | Lip | Vertex | — |
| 31 | `口角上げ` | `Fac_Mth_R_Up` | Lip | Vertex | — |
| 32 | `口角下げ` | `Fac_Mth_R_Down` | Lip | Vertex | — |
| 33 | `口角下げ２` | `Fac_Mth_Tsundere` | Lip | Vertex | — |
| 34 | `口横広げ` | `Fac_Mth_R_Out` | Lip | Vertex | — |
| 35 | `口横狭め` | `Fac_Mth_L_In` | Lip | Vertex | — |
| 36 | `口上` | `Fac_Mth_Up` | Lip | Vertex | — |
| 37 | `口下` | `Fac_Mth_Down` | Lip | Vertex | — |
| 38 | `口左` | `Fac_Mth_Left` | Lip | Vertex | — |
| 39 | `口右` | `Fac_Mth_Right` | Lip | Vertex | — |

<a id="model-04"></a>
### 04. Amber

- Format: PMX
- Asset path: `gi/chars/Amber/Amber/安柏.pmx`
- Embedded name: `安柏`
- Embedded English name: `安柏`
- Cache file: `84f13fda26490c10a3bf9bf7c80061253e811b593de0787c8b327ef6e2524b73.asset`
- Morph counts: Eye: 21, Eyebrow: 10, Lip: 17, Other: 1; total: 49.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `あ` | — | Lip | Vertex | a |
| 1 | `い` | — | Lip | Vertex | i |
| 2 | `う` | — | Lip | Vertex | u |
| 3 | `え` | — | Lip | Vertex | e |
| 4 | `お` | — | Lip | Vertex | o |
| 5 | `ω` | — | Lip | Vertex | — |
| 6 | `□` | — | Lip | Vertex | — |
| 7 | `□1` | — | Lip | Vertex | — |
| 8 | `□2` | — | Lip | Vertex | — |
| 9 | `にやり` | — | Lip | Vertex | smile |
| 10 | `にやり２` | — | Lip | Vertex | — |
| 11 | `にっこり` | — | Lip | Vertex | — |
| 12 | `ぺろっ` | — | Lip | Vertex | — |
| 13 | `てへぺろ` | — | Lip | Vertex | — |
| 14 | `口横広げ` | — | Lip | Vertex | — |
| 15 | `口横缩げ` | — | Lip | Vertex | — |
| 16 | `口角下げ` | — | Lip | Vertex | — |
| 17 | `まばたき` | — | Eye | Group | blink |
| 18 | `笑い` | — | Eye | Group | smileEyes |
| 19 | `ウィンク` | — | Eye | Vertex | — |
| 20 | `ウィンク右` | — | Eye | Vertex | — |
| 21 | `ウィンク２` | — | Eye | Vertex | — |
| 22 | `ｳｨﾝｸ２右` | — | Eye | Vertex | — |
| 23 | `ｷﾘｯ` | — | Eye | Vertex | — |
| 24 | `びっくり` | — | Eye | Vertex | surprised |
| 25 | `なごみ` | — | Eye | Vertex | — |
| 26 | `なごみ2` | — | Eye | Vertex | — |
| 27 | `はちゅ目` | — | Eye | Vertex | — |
| 28 | `はぅ` | — | Eye | Vertex | — |
| 29 | `じと目` | — | Eye | Vertex | — |
| 30 | `瞳小` | — | Eye | Vertex | — |
| 31 | `恐ろしい子！` | — | Eye | Vertex | — |
| 32 | `Eye_Wail` | — | Eye | Vertex | — |
| 33 | `Eye_Tired` | — | Eye | Vertex | — |
| 34 | `Eye_WUp` | — | Eye | Vertex | — |
| 35 | `Eye_WDown` | — | Eye | Vertex | — |
| 36 | `Eye_Lowereyelid` | — | Eye | Vertex | — |
| 37 | `Eye_Default` | — | Eye | Vertex | — |
| 38 | `真面目` | — | Eyebrow | Vertex | — |
| 39 | `困る` | `1` | Eyebrow | Vertex | sad |
| 40 | `にこり` | — | Eyebrow | Vertex | — |
| 41 | `怒り` | — | Eyebrow | Vertex | angry |
| 42 | `上` | — | Eyebrow | Vertex | — |
| 43 | `下` | — | Eyebrow | Vertex | — |
| 44 | `Brow_Shy_L` | — | Eyebrow | Vertex | — |
| 45 | `Brow_Shy_R` | — | Eyebrow | Vertex | — |
| 46 | `Brow_Squeeze_L` | — | Eyebrow | Vertex | — |
| 47 | `Brow_Squeeze_R` | — | Eyebrow | Vertex | — |
| 48 | `照れ` | — | Other | Vertex | — |

<a id="model-05"></a>
### 05. Barbara

- Format: PMX
- Asset path: `gi/chars/Barbara/Barbara/芭芭拉.pmx`
- Embedded name: `Barbara`
- Embedded English name: —
- Cache file: `2b681425cb781074a554c0ecf7f708a3605cd4790bf5aefee7a6b655f408d2c7.asset`
- Morph counts: Eye: 19, Eyebrow: 21, Lip: 20, Other: 1; total: 61.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `あ` | `SkirtF R B04` | Lip | Vertex | a |
| 1 | `い` | `SkirtF CF B02` | Lip | Vertex | i |
| 2 | `う` | `SkirtF R B04` | Lip | Vertex | u |
| 3 | `え` | `SkirtF R B04` | Lip | Vertex | e |
| 4 | `お` | `SkirtF R B04` | Lip | Vertex | o |
| 5 | `ワ` | `SkirtF CF B04` | Lip | Vertex | — |
| 6 | `ん` | `ip001 L Thigh` | Lip | Vertex | — |
| 7 | `い１` | `ip001 L Calf` | Lip | Vertex | — |
| 8 | `い２` | `ip001 L Foot` | Lip | Vertex | — |
| 9 | `あ２` | `ip001 L Toe0` | Lip | Vertex | — |
| 10 | `にやり` | `SkirtF CF B03` | Lip | Vertex | smile |
| 11 | `にやり２` | `ip001 R Thigh` | Lip | Vertex | — |
| 12 | `にやり３` | `ip001 R Calf` | Lip | Vertex | — |
| 13 | `ω` | `ip001 R Foot` | Lip | Vertex | — |
| 14 | `てへぺろ` | `ip001 R Toe0` | Lip | Vertex | — |
| 15 | `ぺろっ` | `PelvisTwist CF A01` | Lip | Vertex | — |
| 16 | `口角上げ` | `SkirtF R B03` | Lip | Vertex | — |
| 17 | `口横広げ` | `outh_Default` | Lip | Vertex | — |
| 18 | `口横狭め` | `outh_A01` | Lip | Vertex | — |
| 19 | `舌広げ` | `outh_Open01` | Lip | Vertex | — |
| 20 | `まばたき` | `outh_Angry02` | Eye | Vertex | blink |
| 21 | `笑い` | `outh_Smile02` | Eye | Vertex | smileEyes |
| 22 | `ウィンク` | `outh_Smile02` | Eye | Vertex | — |
| 23 | `ウィンク右` | `outh_Angry01` | Eye | Vertex | — |
| 24 | `ウィンク２` | `outh_Angry02` | Eye | Vertex | — |
| 25 | `ウィンク２右` | `outh_Angry03` | Eye | Vertex | — |
| 26 | `目星` | — | Eye | Vertex | — |
| 27 | `はぅ` | — | Eye | Vertex | — |
| 28 | `なごみ` | `outh_Fury01` | Eye | Vertex | — |
| 29 | `なごみ左` | `outh_Fury01` | Eye | Vertex | — |
| 30 | `なごみ右` | `outh_Doya01` | Eye | Vertex | — |
| 31 | `びっくり` | `outh_Doya02` | Eye | Vertex | surprised |
| 32 | `じと目` | `outh_Neko01` | Eye | Vertex | — |
| 33 | `喜び` | `outh_Pero01` | Eye | Vertex | — |
| 34 | `怒り目` | `outh_Pero02` | Eye | Vertex | — |
| 35 | `ジト目` | `outh_Line01` | Eye | Vertex | — |
| 36 | `眼角up` | `outh_Line02` | Eye | Vertex | — |
| 37 | `眼角down` | `outh_BigTongue01` | Eye | Vertex | — |
| 38 | `下眼up` | `ye_Default` | Eye | Vertex | — |
| 39 | `困る` | `ye_WinkA_R` | Eyebrow | Vertex | sad |
| 40 | `にこり` | `ye_WinkB_R` | Eyebrow | Vertex | — |
| 41 | `怒り` | `ye_WinkC_R` | Eyebrow | Vertex | angry |
| 42 | `真面目` | `ye_Jito` | Eyebrow | Vertex | — |
| 43 | `上` | `ye_Hostility` | Eyebrow | Vertex | — |
| 44 | `下` | `ye_WUp` | Eyebrow | Vertex | — |
| 45 | `前` | `ye_Lowereyelid` | Eyebrow | Vertex | — |
| 46 | `困る左` | `ye_WinkA_R` | Eyebrow | Vertex | — |
| 47 | `困る右` | `ye_WinkB_L` | Eyebrow | Vertex | — |
| 48 | `にこり左` | `ye_WinkB_R` | Eyebrow | Vertex | — |
| 49 | `にこり右` | `ye_WinkC_L` | Eyebrow | Vertex | — |
| 50 | `怒り左` | `ye_WinkC_R` | Eyebrow | Vertex | — |
| 51 | `怒り右` | `ye_Ha` | Eyebrow | Vertex | — |
| 52 | `真面目左` | `ye_Jito` | Eyebrow | Vertex | — |
| 53 | `真面目右` | `ye_Wail` | Eyebrow | Vertex | — |
| 54 | `上左` | `ye_Hostility` | Eyebrow | Vertex | — |
| 55 | `上右` | `ye_Tired` | Eyebrow | Vertex | — |
| 56 | `下左` | `ye_WUp` | Eyebrow | Vertex | — |
| 57 | `下右` | `ye_WDown` | Eyebrow | Vertex | — |
| 58 | `前左` | `ye_Lowereyelid` | Eyebrow | Vertex | — |
| 59 | `前右` | `row_Default` | Eyebrow | Vertex | — |
| 60 | `照れ` | — | Other | Vertex | — |

<a id="model-06"></a>
### 06. Bennett

- Format: PMX
- Asset path: `gi/chars/Bennett/Bennett/班尼特.pmx`
- Embedded name: `Bennett`
- Embedded English name: —
- Cache file: `46eff26a44a0033b090503f9618c9e3a5e4d1288ad56d0fcb71b24570f89233b.asset`
- Morph counts: Eye: 18, Eyebrow: 21, Lip: 21; total: 60.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `あ` | `HemB L D04` | Lip | Vertex | a |
| 1 | `い` | `HemB L D05` | Lip | Vertex | i |
| 2 | `う` | `HemB L D04` | Lip | Vertex | u |
| 3 | `え` | `HemB L D04` | Lip | Vertex | e |
| 4 | `お` | `HemB L D04` | Lip | Vertex | o |
| 5 | `にやり` | `ip001 L Calf` | Lip | Vertex | smile |
| 6 | `ワ` | `ip001 L Foot` | Lip | Vertex | — |
| 7 | `ん` | `ip001 L Toe0` | Lip | Vertex | — |
| 8 | `い１` | `ip001 L Toe0Nub` | Lip | Vertex | — |
| 9 | `い２` | `ip001 R Calf` | Lip | Vertex | — |
| 10 | `あ２` | `ip001 R Foot` | Lip | Vertex | — |
| 11 | `にやり２` | `ip001 R Toe0` | Lip | Vertex | — |
| 12 | `にやり３` | `ip001 R Toe0Nub` | Lip | Vertex | — |
| 13 | `ω` | `LegBagB R A02` | Lip | Vertex | — |
| 14 | `てへぺろ` | `LegBagB R A03` | Lip | Vertex | — |
| 15 | `ぺろっ` | `VisionPelvisS L E02+` | Lip | Vertex | — |
| 16 | `口角上げ` | `HemB L D03` | Lip | Vertex | — |
| 17 | `口角下げ` | `HemB L D03` | Lip | Vertex | — |
| 18 | `口横広げ` | `VisionPelvisS R E02+` | Lip | Vertex | — |
| 19 | `口横狭め` | `LegBagB L A02` | Lip | Vertex | — |
| 20 | `舌広げ` | `LegBagB L A03` | Lip | Vertex | — |
| 21 | `真面目` | `outh_Default` | Eyebrow | Vertex | — |
| 22 | `困る` | `outh_A01` | Eyebrow | Vertex | sad |
| 23 | `にこり` | `outh_Smile01` | Eyebrow | Vertex | — |
| 24 | `怒り` | `outh_Angry01` | Eyebrow | Vertex | angry |
| 25 | `上` | `outh_Doya01` | Eyebrow | Vertex | — |
| 26 | `下` | `outh_Neko01` | Eyebrow | Vertex | — |
| 27 | `前` | `outh_Pero02` | Eyebrow | Vertex | — |
| 28 | `困る左` | `outh_A01` | Eyebrow | Vertex | — |
| 29 | `困る右` | `outh_Open01` | Eyebrow | Vertex | — |
| 30 | `にこり左` | `outh_Smile01` | Eyebrow | Vertex | — |
| 31 | `にこり右` | `outh_Smile02` | Eyebrow | Vertex | — |
| 32 | `怒り左` | `outh_Angry01` | Eyebrow | Vertex | — |
| 33 | `怒り右` | `outh_Angry02` | Eyebrow | Vertex | — |
| 34 | `真面目左` | `outh_Default` | Eyebrow | Vertex | — |
| 35 | `真面目右` | `outh_Default` | Eyebrow | Vertex | — |
| 36 | `上左` | `outh_Doya01` | Eyebrow | Vertex | — |
| 37 | `上右` | `outh_Doya02` | Eyebrow | Vertex | — |
| 38 | `下左` | `outh_Neko01` | Eyebrow | Vertex | — |
| 39 | `下右` | `outh_Pero01` | Eyebrow | Vertex | — |
| 40 | `前左` | `outh_Pero02` | Eyebrow | Vertex | — |
| 41 | `前右` | `outh_Line01` | Eyebrow | Vertex | — |
| 42 | `笑い` | `outh_BigTongue01` | Eye | Vertex | smileEyes |
| 43 | `まばたき` | `row_Trouble_L` | Eye | Vertex | blink |
| 44 | `ウィンク` | `outh_BigTongue01` | Eye | Vertex | — |
| 45 | `ウィンク右` | `row_Default` | Eye | Vertex | — |
| 46 | `ウィンク２` | `row_Trouble_L` | Eye | Vertex | — |
| 47 | `ウィンク２右` | `row_Trouble_R` | Eye | Vertex | — |
| 48 | `なごみ` | `row_Smily_L` | Eye | Vertex | — |
| 49 | `なごみ左` | `row_Smily_L` | Eye | Vertex | — |
| 50 | `なごみ右` | `row_Smily_R` | Eye | Vertex | — |
| 51 | `びっくり` | `row_Angry_L` | Eye | Vertex | surprised |
| 52 | `じと目` | `row_Angry_R` | Eye | Vertex | — |
| 53 | `喜び` | `row_Shy_L` | Eye | Vertex | — |
| 54 | `怒り目` | `row_Shy_R` | Eye | Vertex | — |
| 55 | `ジト目` | `row_Up_L` | Eye | Vertex | — |
| 56 | `眼角上` | `row_Up_R` | Eye | Vertex | — |
| 57 | `眼角下` | `row_Down_L` | Eye | Vertex | — |
| 58 | `下眼上` | `row_Down_R` | Eye | Vertex | — |
| 59 | `星目` | — | Eye | Vertex | — |

<a id="model-07"></a>
### 07. Blackbird

- Format: PMX
- Asset path: `nte/chars/Blackbird/Blackbird.pmx`
- Embedded name: `Blackbird`
- Embedded English name: `Blackbird`
- Cache file: `c4b6986307fae17cfec2ec3c2b2f28498e4d1d1047e2dcd8d4d4c6d3c3f11133.asset`
- Morph counts: Eye: 52, Eyebrow: 21, Lip: 38, Other: 21; total: 132.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `まばたき` | `まばたき` | Eye | Vertex | blink |
| 1 | `笑い` | `笑い` | Eye | Vertex | smileEyes |
| 2 | `ウィンク右` | `ウィンク右` | Eye | Vertex | — |
| 3 | `ウィンク` | `ウィンク` | Eye | Vertex | — |
| 4 | `ｳｨﾝｸ２右` | `ｳｨﾝｸ２右` | Eye | Vertex | — |
| 5 | `ウィンク２` | `ウィンク２` | Eye | Vertex | — |
| 6 | `瞳小` | `瞳小` | Eye | Vertex | — |
| 7 | `びっくり` | `びっくり` | Eye | Vertex | surprised |
| 8 | `ｷﾘｯ` | `ｷﾘｯ` | Eye | Vertex | — |
| 9 | `目を細める` | `目を細める` | Eye | Vertex | — |
| 10 | `ｷﾘｯ2` | `ｷﾘｯ2` | Eye | Vertex | — |
| 11 | `じと目` | `じと目` | Eye | Vertex | — |
| 12 | `下眼上` | `下眼上` | Eye | Vertex | — |
| 13 | `look_U` | `look_U` | Eye | Vertex | — |
| 14 | `look_RU` | `look_RU` | Eye | Vertex | — |
| 15 | `look_R` | `look_R` | Eye | Vertex | — |
| 16 | `look_RD` | `look_RD` | Eye | Vertex | — |
| 17 | `look_D` | `look_D` | Eye | Vertex | — |
| 18 | `look_LD` | `look_LD` | Eye | Vertex | — |
| 19 | `look_L` | `look_L` | Eye | Vertex | — |
| 20 | `look_LU` | `look_LU` | Eye | Vertex | — |
| 21 | `EL_Happy_l_CLO` | `EL_Happy_l_CLO` | Eye | Vertex | — |
| 22 | `EL_Happy_r_CLO` | `EL_Happy_r_CLO` | Eye | Vertex | — |
| 23 | `eye_SF` | `eye_SF` | Eye | Vertex | — |
| 24 | `EL_Surprised_01` | `EL_Surprised_01` | Eye | Vertex | — |
| 25 | `EL_Smile_01_CLO` | `EL_Smile_01_CLO` | Eye | Vertex | smile |
| 26 | `EL_Angry_01_OP` | `EL_Angry_01_OP` | Eye | Vertex | — |
| 27 | `EL_Angry_01_CLO` | `EL_Angry_01_CLO` | Eye | Vertex | — |
| 28 | `EL_Sad_01_OP` | `EL_Sad_01_OP` | Eye | Vertex | — |
| 29 | `EL_Sad_01_CLO` | `EL_Sad_01_CLO` | Eye | Vertex | — |
| 30 | `EL_Despise_01_OP` | `EL_Despise_01_OP` | Eye | Vertex | — |
| 31 | `EL_Despise_01_CLO` | `EL_Despise_01_CLO` | Eye | Vertex | — |
| 32 | `EL_Doubt_01_OP` | `EL_Doubt_01_OP` | Eye | Vertex | — |
| 33 | `EL_Doubt_01_CLO` | `EL_Doubt_01_CLO` | Eye | Vertex | — |
| 34 | `EL_Evil_01_OP` | `EL_Evil_01_OP` | Eye | Vertex | — |
| 35 | `EL_Evil_01_CLO` | `EL_Evil_01_CLO` | Eye | Vertex | — |
| 36 | `EL_Tired_01_OP` | `EL_Tired_01_OP` | Eye | Vertex | — |
| 37 | `EL_Tired_01_CLO` | `EL_Tired_01_CLO` | Eye | Vertex | — |
| 38 | `EL_Serious_01_OP` | `EL_Serious_01_OP` | Eye | Vertex | — |
| 39 | `EL_Serious_01_CLO` | `EL_Serious_01_CLO` | Eye | Vertex | — |
| 40 | `EL_Thinking_01_OP` | `EL_Thinking_01_OP` | Eye | Vertex | — |
| 41 | `EL_Thinking_01_CLO` | `EL_Thinking_01_CLO` | Eye | Vertex | — |
| 42 | `biyan_R` | `biyan_R` | Eye | Vertex | — |
| 43 | `biyan_L` | `biyan_L` | Eye | Vertex | — |
| 44 | `biyan` | `biyan` | Eye | Vertex | — |
| 45 | `biyan1` | `biyan1` | Eye | Vertex | — |
| 46 | `EL_Up` | `EL_Up` | Eye | Vertex | — |
| 47 | `EL_Down` | `EL_Down` | Eye | Vertex | — |
| 48 | `EL_CornerDown` | `EL_CornerDown` | Eye | Vertex | — |
| 49 | `EL_CornerUp` | `EL_CornerUp` | Eye | Vertex | — |
| 50 | `EL_Light_Up` | `EL_Light_Up` | Eye | Vertex | — |
| 51 | `EL_Light_L` | `EL_Light_L` | Eye | Vertex | — |
| 52 | `あ` | `あ` | Lip | Vertex | a |
| 53 | `い` | `い` | Lip | Vertex | i |
| 54 | `う` | `う` | Lip | Vertex | u |
| 55 | `え` | `え` | Lip | Vertex | e |
| 56 | `お` | `お` | Lip | Vertex | o |
| 57 | `ん` | `ん` | Lip | Vertex | — |
| 58 | `あ2` | `あ2` | Lip | Vertex | — |
| 59 | `う2` | `う2` | Lip | Vertex | — |
| 60 | `ワ` | `ワ` | Lip | Vertex | — |
| 61 | `口横狭げ` | `口横狭げ` | Lip | Vertex | — |
| 62 | `mouthPucker` | `mouthPucker` | Lip | Vertex | — |
| 63 | `mouthFunnel` | `mouthFunnel` | Lip | Vertex | — |
| 64 | `mouthRollUpper` | `mouthRollUpper` | Lip | Vertex | — |
| 65 | `mouthRollLower` | `mouthRollLower` | Lip | Vertex | — |
| 66 | `jawOpen` | `jawOpen` | Lip | Vertex | — |
| 67 | `jawOpen_a` | `jawOpen_a` | Lip | Vertex | — |
| 68 | `jawOpen_yi` | `jawOpen_yi` | Lip | Vertex | — |
| 69 | `jawOpen_wu` | `jawOpen_wu` | Lip | Vertex | — |
| 70 | `jawOpen_ei` | `jawOpen_ei` | Lip | Vertex | — |
| 71 | `jawOpen_o` | `jawOpen_o` | Lip | Vertex | — |
| 72 | `jawOpen_Happy_01_OP` | `jawOpen_Happy_01_OP` | Lip | Vertex | — |
| 73 | `jawOpen_Happy_01_CLO` | `jawOpen_Happy_01_CLO` | Lip | Vertex | — |
| 74 | `jawOpen_Surprised_01_OP` | `jawOpen_Surprised_01_OP` | Lip | Vertex | — |
| 75 | `jawOpen_Surprised_01_CLO` | `jawOpen_Surprised_01_CLO` | Lip | Vertex | — |
| 76 | `jawOpen_Angry_01_OP` | `jawOpen_Angry_01_OP` | Lip | Vertex | — |
| 77 | `jawOpen_Angry_01_CLO` | `jawOpen_Angry_01_CLO` | Lip | Vertex | — |
| 78 | `jawOpen_Smile_01_OP` | `jawOpen_Smile_01_OP` | Lip | Vertex | — |
| 79 | `jawOpen_Smile_01_CLO` | `jawOpen_Smile_01_CLO` | Lip | Vertex | — |
| 80 | `jawOpen_Sad_01_OP` | `jawOpen_Sad_01_OP` | Lip | Vertex | — |
| 81 | `jawOpen_Sad_01_CLO` | `jawOpen_Sad_01_CLO` | Lip | Vertex | — |
| 82 | `jawOpen_Despise_01_OP` | `jawOpen_Despise_01_OP` | Lip | Vertex | — |
| 83 | `jawOpen_Despise_01_CLO` | `jawOpen_Despise_01_CLO` | Lip | Vertex | — |
| 84 | `jawOpen_Doubt_01_OP` | `jawOpen_Doubt_01_OP` | Lip | Vertex | — |
| 85 | `jawOpen_Doubt_01_CLO` | `jawOpen_Doubt_01_CLO` | Lip | Vertex | — |
| 86 | `jawOpen_Evil_01_OP` | `jawOpen_Evil_01_OP` | Lip | Vertex | — |
| 87 | `jawOpen_Evil_01_CLO` | `jawOpen_Evil_01_CLO` | Lip | Vertex | — |
| 88 | `jawOpen_Tired_01_OP` | `jawOpen_Tired_01_OP` | Lip | Vertex | — |
| 89 | `jawOpen_Tired_01_CLO` | `jawOpen_Tired_01_CLO` | Lip | Vertex | — |
| 90 | `にこり` | `にこり` | Eyebrow | Vertex | — |
| 91 | `怒り` | `怒り` | Eyebrow | Vertex | angry |
| 92 | `困る` | `困る` | Eyebrow | Vertex | sad |
| 93 | `真面目` | `真面目` | Eyebrow | Vertex | — |
| 94 | `左上` | `左上` | Eyebrow | Vertex | — |
| 95 | `右上` | `右上` | Eyebrow | Vertex | — |
| 96 | `EB_happy_01` | `EB_happy_01` | Eyebrow | Vertex | — |
| 97 | `EB_Surprised_01` | `EB_Surprised_01` | Eyebrow | Vertex | — |
| 98 | `EB_Smile_01` | `EB_Smile_01` | Eyebrow | Vertex | — |
| 99 | `EB_Angry_01` | `EB_Angry_01` | Eyebrow | Vertex | — |
| 100 | `EB_Sad_01` | `EB_Sad_01` | Eyebrow | Vertex | — |
| 101 | `EB_Despise_01` | `EB_Despise_01` | Eyebrow | Vertex | — |
| 102 | `EB_Doubt_01` | `EB_Doubt_01` | Eyebrow | Vertex | — |
| 103 | `EB_Evil_01` | `EB_Evil_01` | Eyebrow | Vertex | — |
| 104 | `EB_Tired_01` | `EB_Tired_01` | Eyebrow | Vertex | — |
| 105 | `EB_Serious_01` | `EB_Serious_01` | Eyebrow | Vertex | — |
| 106 | `EB_Thinking_01` | `EB_Thinking_01` | Eyebrow | Vertex | — |
| 107 | `EB_UD_L` | `EB_UD_L` | Eyebrow | Vertex | — |
| 108 | `EB_UD_R` | `EB_UD_R` | Eyebrow | Vertex | — |
| 109 | `EB_Rotate_01` | `EB_Rotate_01` | Eyebrow | Vertex | — |
| 110 | `EB_Rotate_02` | `EB_Rotate_02` | Eyebrow | Vertex | — |
| 111 | `TD_EyesClo` | `TD_EyesClo` | Other | Vertex | — |
| 112 | `TD_Scale` | — | Other | Vertex | — |
| 113 | `TD_Veins` | — | Other | Vertex | — |
| 114 | `TD_Exclamation` | — | Other | Vertex | — |
| 115 | `TD_Amazed` | — | Other | Vertex | — |
| 116 | `TD_Sweaty` | — | Other | Vertex | — |
| 117 | `TD_Hate` | — | Other | Vertex | — |
| 118 | `TD_BeanieEye` | — | Other | Vertex | — |
| 119 | `TD_SymbolEye` | — | Other | Vertex | — |
| 120 | `TD_EggEyes` | — | Other | Vertex | — |
| 121 | `Breathe_Spine2_UPB` | `Breathe_Spine2_UPB` | Other | Vertex | — |
| 122 | `Breathe_Spine2_UP` | `Breathe_Spine2_UP` | Other | Vertex | — |
| 123 | `Breathe_UpperArm_L_UP` | `Breathe_UpperArm_L_UP` | Other | Vertex | — |
| 124 | `Breathe_UpperArm_R_UP` | `Breathe_UpperArm_R_UP` | Other | Vertex | — |
| 125 | `player_042_Blackbird_yumao003` | `player_042_Blackbird_yumao003` | Other | Vertex | — |
| 126 | `yumaoshensuo_zuo` | `yumaoshensuo_zuo` | Other | Vertex | — |
| 127 | `yumaoshensuo_you` | `yumaoshensuo_you` | Other | Vertex | — |
| 128 | `yumaoshensuo_zuo_qian` | `yumaoshensuo_zuo_qian` | Other | Vertex | — |
| 129 | `player_042_Blackbird_yumao002` | `player_042_Blackbird_yumao002` | Other | Vertex | — |
| 130 | `yumaoshensuo_zuo_shang` | `yumaoshensuo_zuo_shang` | Other | Vertex | — |
| 131 | `yumaoshensuo_you_shang` | `yumaoshensuo_you_shang` | Other | Vertex | — |

<a id="model-08"></a>
### 08. Brant

- Format: BPMX
- Asset path: `ww/chars/Brant/Brant.bpmx`
- Embedded name: `鳴潮_布蘭特`
- Embedded English name: `New MMD Model`
- Cache file: `0c16321f495885d709820069749246e0346434df1fc50d954e10ea8dedd147df.asset`
- Morph counts: Eye: 32, Eyebrow: 23, Lip: 37, Other: 53, System: 16; total: 161.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `真面目` | — | Eyebrow | Vertex | — |
| 1 | `真面目L` | — | Eyebrow | Vertex | — |
| 2 | `真面目R` | — | Eyebrow | Vertex | — |
| 3 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 4 | `怒りL` | `B_Anger` | Eyebrow | Vertex | — |
| 5 | `怒りR` | `B_Anger` | Eyebrow | Vertex | — |
| 6 | `にこり` | `B_Happy` | Eyebrow | Vertex | — |
| 7 | `にこりL` | `B_Happy` | Eyebrow | Vertex | — |
| 8 | `にこりR` | `B_Happy` | Eyebrow | Vertex | — |
| 9 | `にこり2` | `B_Cheerful` | Eyebrow | Vertex | — |
| 10 | `困る` | `B_Sad` | Eyebrow | Vertex | sad |
| 11 | `困るL` | `B_Sad` | Eyebrow | Vertex | — |
| 12 | `困るR` | `B_Sad` | Eyebrow | Vertex | — |
| 13 | `平行` | `B_Flat` | Eyebrow | Vertex | — |
| 14 | `怪訝右` | `B_AH_R` | Eyebrow | Vertex | — |
| 15 | `怪訝左` | `B_AH_L` | Eyebrow | Vertex | — |
| 16 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 17 | `上L` | `B_Up_Add` | Eyebrow | Vertex | — |
| 18 | `上R` | `B_Up_Add` | Eyebrow | Vertex | — |
| 19 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 20 | `下L` | `B_Down_Add` | Eyebrow | Vertex | — |
| 21 | `下R` | `B_Down_Add` | Eyebrow | Vertex | — |
| 22 | `中` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 23 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 24 | `笑い` | — | Eye | Vertex | smileEyes |
| 25 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 26 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 27 | `ウィンク２` | `E_Close` | Eye | Vertex | — |
| 28 | `ｳｨﾝｸ２右` | `E_Close` | Eye | Vertex | — |
| 29 | `ｷﾘｯ` | `E_Anger` | Eye | Vertex | — |
| 30 | `垂れ目` | `E_Sad` | Eye | Vertex | — |
| 31 | `なごみ` | — | Eye | Vertex | — |
| 32 | `なごみL` | — | Eye | Vertex | — |
| 33 | `なごみR` | — | Eye | Vertex | — |
| 34 | `はぅ` | — | Eye | Vertex | — |
| 35 | `はちゅ目` | — | Eye | Vertex | — |
| 36 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 37 | `じと目L` | `E_Insipid` | Eye | Vertex | — |
| 38 | `じと目R` | `E_Insipid` | Eye | Vertex | — |
| 39 | `じと目2` | `E_Focus` | Eye | Vertex | — |
| 40 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 41 | `笑い目` | `E_Blephar` | Eye | Vertex | — |
| 42 | `up` | `Pupil_Up` | Eye | Vertex | — |
| 43 | `down` | `Pupil_Down` | Eye | Vertex | — |
| 44 | `瞳小` | `瞳小` | Eye | Vertex | — |
| 45 | `瞳小L` | `瞳小` | Eye | Vertex | — |
| 46 | `瞳小R` | `瞳小` | Eye | Vertex | — |
| 47 | `あ` | `A` | Lip | Vertex | a |
| 48 | `い` | — | Lip | Vertex | i |
| 49 | `う` | `U` | Lip | Vertex | u |
| 50 | `え` | `E` | Lip | Vertex | e |
| 51 | `お` | `O` | Lip | Vertex | o |
| 52 | `にやり` | — | Lip | Vertex | smile |
| 53 | `∧` | — | Lip | Vertex | — |
| 54 | `口角上げ` | — | Lip | Vertex | — |
| 55 | `口角下げ` | — | Lip | Vertex | — |
| 56 | `口横広げ` | — | Lip | Vertex | — |
| 57 | `右口角上げ` | `M_Smile_R` | Lip | Vertex | — |
| 58 | `左口角上げ` | `M_Smile_L` | Lip | Vertex | — |
| 59 | `右口角下げ` | `M_Ennui_R` | Lip | Vertex | — |
| 60 | `左口角下げ` | `M_Ennui_L` | Lip | Vertex | — |
| 61 | `右口横広げ` | `P_M_R_Add` | Lip | Vertex | — |
| 62 | `左口横広げ` | `P_M_L_Add` | Lip | Vertex | — |
| 63 | `口横狭め` | `P_M_Scale_Add` | Lip | Vertex | — |
| 64 | `口` | `Aa` | Lip | Vertex | — |
| 65 | `ぺろっ` | — | Lip | Vertex | — |
| 66 | `い3` | `M_OpenSmall` | Lip | Vertex | — |
| 67 | `д` | `M_Scared` | Lip | Vertex | — |
| 68 | `い2` | `M_ScaredTooth` | Lip | Vertex | — |
| 69 | `いい` | `I` | Lip | Vertex | — |
| 70 | `(○｀ε´○)` | `M_Anger` | Lip | Vertex | — |
| 71 | `ワ` | `M_Trapezoid` | Lip | Vertex | — |
| 72 | `お2` | `M_O` | Lip | Vertex | — |
| 73 | `あ3` | `M_A` | Lip | Vertex | — |
| 74 | `M` | `M_Nutcracker` | Lip | Vertex | — |
| 75 | `右口角上げ2` | `P_M_ZR_Add` | Lip | Vertex | — |
| 76 | `左口角上げ2` | `P_M_ZL_Add` | Lip | Vertex | — |
| 77 | `lip thick` | `C_M_Distant` | Lip | Vertex | — |
| 78 | `口上` | `P_M_Up_Add` | Lip | Vertex | — |
| 79 | `口下` | `P_M_Down_Add` | Lip | Vertex | — |
| 80 | `口右` | `P_M_RMove_Add` | Lip | Vertex | — |
| 81 | `口左` | `P_M_LMove_Add` | Lip | Vertex | — |
| 82 | `lip thin` | `P_M_MidPoint_Add` | Lip | Vertex | — |
| 83 | `口出` | `P_M_UpDownView_Add` | Lip | Vertex | — |
| 84 | `hat off` | — | Other | Group | — |
| 85 | `照れ` | — | Other | Vertex | — |
| 86 | `照れ2` | — | Other | Vertex | — |
| 87 | `hat off+` | — | Other | Material | — |
| 88 | `head recover` | — | Other | Vertex | — |
| 89 | `head small` | — | Other | Bone | — |
| 90 | `star al` | — | Other | Material | — |
| 91 | `星目` | — | Eye | Vertex | — |
| 92 | `はぁと` | — | Eye | Vertex | — |
| 93 | `eye al` | — | Eye | Material | — |
| 94 | `eye off` | — | Eye | Material | — |
| 95 | `eye hi off` | — | Eye | Material | — |
| 96 | `eye hi al` | — | Eye | Material | — |
| 97 | `eye hi2 off` | — | Eye | Material | — |
| 98 | `eye hi2 al` | — | Eye | Material | — |
| 99 | `emo3左` | — | System | Vertex | — |
| 100 | `emo3右` | — | System | Vertex | — |
| 101 | `emo3上` | — | System | Vertex | — |
| 102 | `nu` | — | System | UV | — |
| 103 | `haha` | — | System | UV | — |
| 104 | `han` | — | System | UV | — |
| 105 | `xin` | — | System | UV | — |
| 106 | `jing` | — | System | UV | — |
| 107 | `heixian` | — | System | UV | — |
| 108 | `wenhao` | — | System | UV | — |
| 109 | `handi` | — | System | UV | — |
| 110 | `jingtanhao` | — | System | UV | — |
| 111 | `zhuyi` | — | System | UV | — |
| 112 | `luanma` | — | System | UV | — |
| 113 | `keshui` | — | System | UV | — |
| 114 | `shenluehao` | — | System | UV | — |
| 115 | `(#｀皿´)` | — | Other | Group | — |
| 116 | `O(∩_∩)O` | — | Other | Group | — |
| 117 | `(-ω-；)` | — | Other | Group | — |
| 118 | `喜(=゜ω゜)ノ` | — | Other | Group | — |
| 119 | `∑(´△｀)！` | — | Other | Group | — |
| 120 | `-﹏-&#124;&#124;&#124;` | — | Other | Group | — |
| 121 | `[・_・?]` | — | Other | Group | — |
| 122 | `(｡ω｡；)` | — | Other | Group | — |
| 123 | `(´△｀)！` | — | Other | Group | — |
| 124 | `d(^^*)` | — | Other | Group | — |
| 125 | `彡(-_-;)彡` | — | Other | Group | — |
| 126 | `(。-ω-)zzz` | — | Other | Group | — |
| 127 | `(¬_¬)ﾉ…` | — | Other | Group | — |
| 128 | `見開く` | — | Other | Group | — |
| 129 | `にこりB` | — | Other | Group | — |
| 130 | `困るB` | — | Other | Group | — |
| 131 | `怒りB` | — | Other | Group | — |
| 132 | `にこりA` | — | Other | Group | — |
| 133 | `真面目A` | — | Other | Group | — |
| 134 | `困るA` | — | Other | Group | — |
| 135 | `怒りA` | — | Other | Group | — |
| 136 | `笑いA` | — | Other | Group | — |
| 137 | `まばたきA` | — | Other | Group | — |
| 138 | `寄り目` | — | Other | Bone | — |
| 139 | `+目下` | — | Other | Bone | — |
| 140 | `+目上` | — | Other | Bone | — |
| 141 | `鼻上` | `P_Nose_Up` | Other | Vertex | — |
| 142 | `鼻下` | `P_Nose_Down` | Other | Vertex | — |
| 143 | `右face調整` | `C_ZR_Face` | Other | Vertex | — |
| 144 | `左face調整` | `C_ZL_Face` | Other | Vertex | — |
| 145 | `xiaba上` | `C_Down_Face` | Other | Vertex | — |
| 146 | `眉骨` | `C_Up_Face` | Other | Vertex | — |
| 147 | `L_P` | `L_P` | Other | Vertex | — |
| 148 | `L_F` | `L_F` | Other | Vertex | — |
| 149 | `L_B` | `L_B` | Other | Vertex | — |
| 150 | `L_F_U` | `L_F_U` | Other | Vertex | — |
| 151 | `L_B_U` | `L_B_U` | Other | Vertex | — |
| 152 | `L_Up` | `L_Up` | Other | Vertex | — |
| 153 | `L_Up_U` | `L_Up_U` | Other | Vertex | — |
| 154 | `R_P` | `R_P` | Other | Vertex | — |
| 155 | `R_F` | `R_F` | Other | Vertex | — |
| 156 | `R_B` | `R_B` | Other | Vertex | — |
| 157 | `R_F_U` | `R_F_U` | Other | Vertex | — |
| 158 | `R_B_U` | `R_B_U` | Other | Vertex | — |
| 159 | `R_Up` | `R_Up` | Other | Vertex | — |
| 160 | `R_Up_U` | `R_Up_U` | Other | Vertex | — |

<a id="model-09"></a>
### 09. Cantarella

- Format: PMX
- Asset path: `ww/chars/Cantarella/Cantarella.pmx`
- Embedded name: `Cantarella`
- Embedded English name: `Cantarella`
- Cache file: `317b82f68d104469b87d9cd4baeea2541d1dca20acf52ed1576dd990d3735e92.asset`
- Morph counts: Eye: 17, Eyebrow: 12, Lip: 36, Other: 4; total: 69.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 1 | `ウィンク２` | `E_Close` | Eye | Vertex | — |
| 2 | `ウィンク２右` | `E_Close` | Eye | Vertex | — |
| 3 | `笑い` | `E_Smile_R` | Eye | Vertex | smileEyes |
| 4 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 5 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 6 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 7 | `怒り目` | `E_Anger` | Eye | Vertex | — |
| 8 | `悲しむ` | `E_Sad` | Eye | Vertex | — |
| 9 | `ジト目` | `E_Focus` | Eye | Vertex | — |
| 10 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 11 | `下眼上` | `E_Blephar` | Eye | Vertex | — |
| 12 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 13 | `目上` | `Pupil_Up` | Eye | Vertex | — |
| 14 | `目下` | `Pupil_Down` | Eye | Vertex | — |
| 15 | `目右` | `Pupil_R` | Eye | Vertex | — |
| 16 | `目左` | `Pupil_L` | Eye | Vertex | — |
| 17 | `あ` | `M_A` | Lip | Vertex | a |
| 18 | `い` | `I` | Lip | Vertex | i |
| 19 | `う` | `U` | Lip | Vertex | u |
| 20 | `え` | `E` | Lip | Vertex | e |
| 21 | `お` | `O` | Lip | Vertex | o |
| 22 | `あ２` | `A` | Lip | Vertex | — |
| 23 | `あ３` | `M_Trapezoid` | Lip | Vertex | — |
| 24 | `い２` | `M_OpenSmall` | Lip | Vertex | — |
| 25 | `い３` | `M_Laugh` | Lip | Vertex | — |
| 26 | `う２` | `S_01` | Lip | Vertex | — |
| 27 | `お２` | `M_O` | Lip | Vertex | — |
| 28 | `ワ` | `Aa` | Lip | Vertex | — |
| 29 | `にやり` | `M_Smile_R` | Lip | Vertex | smile |
| 30 | `にやり２` | `M_Smile_L` | Lip | Vertex | — |
| 31 | `ぺろっ` | `S_03` | Lip | Vertex | — |
| 32 | `ぺろっ２` | `S_04` | Lip | Vertex | — |
| 33 | `□` | `M_Scared` | Lip | Vertex | — |
| 34 | `□２` | `M_ScaredTooth` | Lip | Vertex | — |
| 35 | `w` | `M_Anger` | Lip | Vertex | — |
| 36 | `口角上げ` | `M_Smile_R` | Lip | Vertex | — |
| 37 | `口角下げ` | `M_Ennui_R` | Lip | Vertex | — |
| 38 | `口角下げ２` | `M_Nutcracker` | Lip | Vertex | — |
| 39 | `口横広げ` | `P_M_R_Add` | Lip | Vertex | — |
| 40 | `口横狭め` | `P_M_Scale_Add` | Lip | Vertex | — |
| 41 | `口角平げ` | `S_05` | Lip | Vertex | — |
| 42 | `口角後` | `P_M_ZR_Add` | Lip | Vertex | — |
| 43 | `口角前` | `C_Up_Face` | Lip | Vertex | — |
| 44 | `口線大` | `C_M_Distant` | Lip | Vertex | — |
| 45 | `口上` | `P_M_Up_Add` | Lip | Vertex | — |
| 46 | `口下` | `P_M_Down_Add` | Lip | Vertex | — |
| 47 | `口左` | `P_M_LMove_Add` | Lip | Vertex | — |
| 48 | `口右` | `P_M_RMove_Add` | Lip | Vertex | — |
| 49 | `口中無` | `P_M_MidPoint_Add` | Lip | Vertex | — |
| 50 | `口前` | `P_M_UpDownView_Add` | Lip | Vertex | — |
| 51 | `上唇後` | `S_06` | Lip | Vertex | — |
| 52 | `歯消` | `S_08` | Lip | Vertex | — |
| 53 | `真面目` | `B_Sad` | Eyebrow | Vertex | — |
| 54 | `困る` | `B_Sad` | Eyebrow | Vertex | sad |
| 55 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 56 | `にこり` | `B_Cheerful` | Eyebrow | Vertex | — |
| 57 | `にこり２` | `B_Happy` | Eyebrow | Vertex | — |
| 58 | `恥ずかしい` | `B_Flat` | Eyebrow | Vertex | — |
| 59 | `挑発する` | `B_AH_L` | Eyebrow | Vertex | — |
| 60 | `挑発する右` | `B_AH_R` | Eyebrow | Vertex | — |
| 61 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 62 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 63 | `眉狭` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 64 | `眉後` | `S_10` | Eyebrow | Vertex | — |
| 65 | `顏前` | `C_ZR_Face` | Other | Vertex | — |
| 66 | `下頜輪郭` | `C_Down_Face` | Other | Vertex | — |
| 67 | `鼻上` | `P_Nose_Up` | Other | Vertex | — |
| 68 | `鼻下` | `P_Nose_Down` | Other | Vertex | — |

<a id="model-10"></a>
### 10. Carlotta

- Format: PMX
- Asset path: `ww/chars/Carlotta/Carlotta/Carlotta.pmx`
- Embedded name: `柯莱塔`
- Embedded English name: `New MMD Model`
- Cache file: `16213be9740869ece808e409dfd754f12572a867b76e4287c75d0ef9d7b8b7cb.asset`
- Morph counts: Eye: 38, Eyebrow: 24, Lip: 25, Other: 29; total: 116.
- Unmatched app channels: `smile`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `困る` | `B_Sad` | Eyebrow | Vertex | sad |
| 1 | `困る左` | `B_Sad` | Eyebrow | Vertex | — |
| 2 | `困る右` | `B_Sad` | Eyebrow | Vertex | — |
| 3 | `にこり` | `B_Happy` | Eyebrow | Vertex | — |
| 4 | `にこり左` | `B_Happy` | Eyebrow | Vertex | — |
| 5 | `にこり右` | `B_Happy` | Eyebrow | Vertex | — |
| 6 | `にこり２` | `B_Cheerful` | Eyebrow | Vertex | — |
| 7 | `にこり２左` | `B_Cheerful` | Eyebrow | Vertex | — |
| 8 | `にこり２右` | `B_Cheerful` | Eyebrow | Vertex | — |
| 9 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 10 | `怒り右` | `B_AH_R` | Eyebrow | Vertex | — |
| 11 | `怒り左` | `B_AH_L` | Eyebrow | Vertex | — |
| 12 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 13 | `上左` | `B_Up_Add` | Eyebrow | Vertex | — |
| 14 | `上右` | `B_Up_Add` | Eyebrow | Vertex | — |
| 15 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 16 | `下左` | `B_Down_Add` | Eyebrow | Vertex | — |
| 17 | `下右` | `B_Down_Add` | Eyebrow | Vertex | — |
| 18 | `平行` | `B_Flat` | Eyebrow | Vertex | — |
| 19 | `平行左` | `B_Flat` | Eyebrow | Vertex | — |
| 20 | `平行右` | `B_Flat` | Eyebrow | Vertex | — |
| 21 | `入` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 22 | `入左` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 23 | `入右` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 24 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 25 | `ウィンク２` | `E_Close` | Eye | Vertex | — |
| 26 | `ウィンク２右` | `E_Close` | Eye | Vertex | — |
| 27 | `笑い` | `E_Smile_L` | Eye | Vertex | smileEyes |
| 28 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 29 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 30 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 31 | `じと目左` | `E_Insipid` | Eye | Vertex | — |
| 32 | `じと目右` | `E_Insipid` | Eye | Vertex | — |
| 33 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 34 | `びっくり左` | `E_Stare` | Eye | Vertex | — |
| 35 | `びっくり右` | `E_Stare` | Eye | Vertex | — |
| 36 | `キリッ` | `E_Anger` | Eye | Vertex | — |
| 37 | `キリッ左` | `E_Anger` | Eye | Vertex | — |
| 38 | `キリッ右` | `E_Anger` | Eye | Vertex | — |
| 39 | `たれ目` | `E_Focus` | Eye | Vertex | — |
| 40 | `たれ目左` | `E_Focus` | Eye | Vertex | — |
| 41 | `たれ目右` | `E_Focus` | Eye | Vertex | — |
| 42 | `笑い目` | `E_Blephar` | Eye | Vertex | — |
| 43 | `笑い目左` | `E_Blephar` | Eye | Vertex | — |
| 44 | `笑い目右` | `E_Blephar` | Eye | Vertex | — |
| 45 | `悲しい目` | `E_Sad` | Eye | Vertex | — |
| 46 | `悲しい目左` | `E_Sad` | Eye | Vertex | — |
| 47 | `悲しい目右` | `E_Sad` | Eye | Vertex | — |
| 48 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 49 | `瞳小左` | `Pupil_Scale` | Eye | Vertex | — |
| 50 | `瞳小右` | `Pupil_Scale` | Eye | Vertex | — |
| 51 | `ハイライト消` | — | Eye | Vertex | — |
| 52 | `ハイライト消左` | — | Eye | Vertex | — |
| 53 | `ハイライト消右` | — | Eye | Vertex | — |
| 54 | `恐ろしい子！` | — | Eye | Vertex | — |
| 55 | `恐ろしい子！左` | — | Eye | Vertex | — |
| 56 | `恐ろしい子！右` | — | Eye | Vertex | — |
| 57 | `カメラ目` | — | Eye | Vertex | — |
| 58 | `Up` | `Pupil_Up` | Eye | Vertex | — |
| 59 | `Down` | `Pupil_Down` | Eye | Vertex | — |
| 60 | `Right` | `Pupil_R` | Eye | Vertex | — |
| 61 | `Left` | `Pupil_L` | Eye | Vertex | — |
| 62 | `あ` | `A` | Lip | Vertex | a |
| 63 | `あ２` | `Aa` | Lip | Vertex | — |
| 64 | `ああ` | `M_Trapezoid` | Lip | Vertex | — |
| 65 | `い` | `I` | Lip | Vertex | i |
| 66 | `い２` | `M_ScaredTooth` | Lip | Vertex | — |
| 67 | `う` | `U` | Lip | Vertex | u |
| 68 | `う２` | `M_OpenSmall` | Lip | Vertex | — |
| 69 | `え` | `E` | Lip | Vertex | e |
| 70 | `お` | `O` | Lip | Vertex | o |
| 71 | `お２` | `M_O` | Lip | Vertex | — |
| 72 | `ワ` | `M_Laugh` | Lip | Vertex | — |
| 73 | `ん` | `M_Anger` | Lip | Vertex | — |
| 74 | `ん２` | `C_M_Distant` | Lip | Vertex | — |
| 75 | `∧` | `M_Nutcracker` | Lip | Vertex | — |
| 76 | `□` | `M_A` | Lip | Vertex | — |
| 77 | `なんで` | `M_Scared` | Lip | Vertex | — |
| 78 | `口角下げ左` | `M_Ennui_L` | Lip | Vertex | — |
| 79 | `口角下げ右` | `M_Ennui_R` | Lip | Vertex | — |
| 80 | `口角上げ左` | `M_Smile_L` | Lip | Vertex | — |
| 81 | `口角上げ右` | `M_Smile_R` | Lip | Vertex | — |
| 82 | `口横広げ左` | `P_M_L_Add` | Lip | Vertex | — |
| 83 | `口横広げ右` | `P_M_R_Add` | Lip | Vertex | — |
| 84 | `口横広げ2右` | `P_M_ZR_Add` | Lip | Vertex | — |
| 85 | `口横広げ2左` | `P_M_ZL_Add` | Lip | Vertex | — |
| 86 | `口横縮小` | `P_M_Scale_Add` | Lip | Vertex | — |
| 87 | `齶右` | `C_ZR_Face` | Other | Vertex | — |
| 88 | `齶左` | `C_ZL_Face` | Other | Vertex | — |
| 89 | `齶前` | `C_Down_Face` | Other | Vertex | — |
| 90 | `齶上` | `C_Up_Face` | Other | Vertex | — |
| 91 | `鼻上` | `P_Nose_Up` | Other | Vertex | — |
| 92 | `鼻下` | `P_Nose_Down` | Other | Vertex | — |
| 93 | `口上` | `P_M_Up_Add` | Other | Vertex | — |
| 94 | `口下` | `P_M_Down_Add` | Other | Vertex | — |
| 95 | `口右` | `P_M_RMove_Add` | Other | Vertex | — |
| 96 | `口左` | `P_M_LMove_Add` | Other | Vertex | — |
| 97 | `唇中` | `P_M_MidPoint_Add` | Other | Vertex | — |
| 98 | `口角前` | `P_M_UpDownView_Add` | Other | Vertex | — |
| 99 | `星目` | `星目` | Other | Vertex | — |
| 100 | `星目2` | — | Other | Vertex | — |
| 101 | `はぁと` | — | Other | Vertex | — |
| 102 | `はぁと2` | — | Other | Vertex | — |
| 103 | `FaceRed` | `FaceRed` | Other | Vertex | — |
| 104 | `#` | `#` | Other | Vertex | — |
| 105 | `#2` | `#2` | Other | Vertex | — |
| 106 | `？` | `？` | Other | Vertex | — |
| 107 | `！` | `！` | Other | Vertex | — |
| 108 | `ZZZ` | `ZZZ` | Other | Vertex | — |
| 109 | `汗` | `汗` | Other | Vertex | — |
| 110 | `はちゅ` | `はちゅ` | Other | Vertex | — |
| 111 | `惊` | `惊` | Other | Vertex | — |
| 112 | `……` | `……` | Other | Vertex | — |
| 113 | `照れ` | `照れ` | Other | Vertex | — |
| 114 | `照れ2` | `照れ2` | Other | Vertex | — |
| 115 | `涙` | `涙` | Other | Vertex | — |

<a id="model-11"></a>
### 11. Carlotta

- Format: PMX
- Asset path: `ww/chars/Carlotta/Carlotta_skin/Carlotta.pmx`
- Embedded name: `珂莱塔`
- Embedded English name: `珂莱塔`
- Cache file: `61808f0ef3af0ac6d07c51fc71db1209575cba8ddcc67eca208ffdc0e6177a91.asset`
- Morph counts: Eye: 38, Eyebrow: 24, Lip: 25, Other: 31; total: 118.
- Unmatched app channels: `smile`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `困る` | `B_Sad` | Eyebrow | Vertex | sad |
| 1 | `困る左` | `B_Sad` | Eyebrow | Vertex | — |
| 2 | `困る右` | `B_Sad` | Eyebrow | Vertex | — |
| 3 | `にこり` | `B_Happy` | Eyebrow | Vertex | — |
| 4 | `にこり左` | `B_Happy` | Eyebrow | Vertex | — |
| 5 | `にこり右` | `B_Happy` | Eyebrow | Vertex | — |
| 6 | `にこり２` | `B_Cheerful` | Eyebrow | Vertex | — |
| 7 | `にこり２左` | `B_Cheerful` | Eyebrow | Vertex | — |
| 8 | `にこり２右` | `B_Cheerful` | Eyebrow | Vertex | — |
| 9 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 10 | `怒り右` | `B_AH_R` | Eyebrow | Vertex | — |
| 11 | `怒り左` | `B_AH_L` | Eyebrow | Vertex | — |
| 12 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 13 | `上左` | `B_Up_Add` | Eyebrow | Vertex | — |
| 14 | `上右` | `B_Up_Add` | Eyebrow | Vertex | — |
| 15 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 16 | `下左` | `B_Down_Add` | Eyebrow | Vertex | — |
| 17 | `下右` | `B_Down_Add` | Eyebrow | Vertex | — |
| 18 | `平行` | `B_Flat` | Eyebrow | Vertex | — |
| 19 | `平行左` | `B_Flat` | Eyebrow | Vertex | — |
| 20 | `平行右` | `B_Flat` | Eyebrow | Vertex | — |
| 21 | `入` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 22 | `入左` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 23 | `入右` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 24 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 25 | `ウィンク２` | `E_Close` | Eye | Vertex | — |
| 26 | `ウィンク２右` | `E_Close` | Eye | Vertex | — |
| 27 | `笑い` | `E_Smile_L` | Eye | Vertex | smileEyes |
| 28 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 29 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 30 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 31 | `じと目左` | `E_Insipid` | Eye | Vertex | — |
| 32 | `じと目右` | `E_Insipid` | Eye | Vertex | — |
| 33 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 34 | `びっくり左` | `E_Stare` | Eye | Vertex | — |
| 35 | `びっくり右` | `E_Stare` | Eye | Vertex | — |
| 36 | `キリッ` | `E_Anger` | Eye | Vertex | — |
| 37 | `キリッ左` | `E_Anger` | Eye | Vertex | — |
| 38 | `キリッ右` | `E_Anger` | Eye | Vertex | — |
| 39 | `たれ目` | `E_Focus` | Eye | Vertex | — |
| 40 | `たれ目左` | `E_Focus` | Eye | Vertex | — |
| 41 | `たれ目右` | `E_Focus` | Eye | Vertex | — |
| 42 | `笑い目` | `E_Blephar` | Eye | Vertex | — |
| 43 | `笑い目左` | `E_Blephar` | Eye | Vertex | — |
| 44 | `笑い目右` | `E_Blephar` | Eye | Vertex | — |
| 45 | `悲しい目` | `E_Sad` | Eye | Vertex | — |
| 46 | `悲しい目左` | `E_Sad` | Eye | Vertex | — |
| 47 | `悲しい目右` | `E_Sad` | Eye | Vertex | — |
| 48 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 49 | `瞳小左` | `Pupil_Scale` | Eye | Vertex | — |
| 50 | `瞳小右` | `Pupil_Scale` | Eye | Vertex | — |
| 51 | `ハイライト消` | — | Eye | Vertex | — |
| 52 | `ハイライト消左` | — | Eye | Vertex | — |
| 53 | `ハイライト消右` | — | Eye | Vertex | — |
| 54 | `恐ろしい子！` | — | Eye | Vertex | — |
| 55 | `恐ろしい子！左` | — | Eye | Vertex | — |
| 56 | `恐ろしい子！右` | — | Eye | Vertex | — |
| 57 | `カメラ目` | — | Eye | Vertex | — |
| 58 | `Up` | `Pupil_Up` | Eye | Vertex | — |
| 59 | `Down` | `Pupil_Down` | Eye | Vertex | — |
| 60 | `Right` | `Pupil_R` | Eye | Vertex | — |
| 61 | `Left` | `Pupil_L` | Eye | Vertex | — |
| 62 | `あ` | `A` | Lip | Vertex | a |
| 63 | `あ２` | `Aa` | Lip | Vertex | — |
| 64 | `ああ` | `M_Trapezoid` | Lip | Vertex | — |
| 65 | `い` | `I` | Lip | Vertex | i |
| 66 | `い２` | `M_ScaredTooth` | Lip | Vertex | — |
| 67 | `う` | `U` | Lip | Vertex | u |
| 68 | `う２` | `M_OpenSmall` | Lip | Vertex | — |
| 69 | `え` | `E` | Lip | Vertex | e |
| 70 | `お` | `O` | Lip | Vertex | o |
| 71 | `お２` | `M_O` | Lip | Vertex | — |
| 72 | `ワ` | `M_Laugh` | Lip | Vertex | — |
| 73 | `ん` | `M_Anger` | Lip | Vertex | — |
| 74 | `ん２` | `C_M_Distant` | Lip | Vertex | — |
| 75 | `∧` | `M_Nutcracker` | Lip | Vertex | — |
| 76 | `□` | `M_A` | Lip | Vertex | — |
| 77 | `なんで` | `M_Scared` | Lip | Vertex | — |
| 78 | `口角下げ左` | `M_Ennui_L` | Lip | Vertex | — |
| 79 | `口角下げ右` | `M_Ennui_R` | Lip | Vertex | — |
| 80 | `口角上げ左` | `M_Smile_L` | Lip | Vertex | — |
| 81 | `口角上げ右` | `M_Smile_R` | Lip | Vertex | — |
| 82 | `口横広げ左` | `P_M_L_Add` | Lip | Vertex | — |
| 83 | `口横広げ右` | `P_M_R_Add` | Lip | Vertex | — |
| 84 | `口横広げ2右` | `P_M_ZR_Add` | Lip | Vertex | — |
| 85 | `口横広げ2左` | `P_M_ZL_Add` | Lip | Vertex | — |
| 86 | `口横縮小` | `P_M_Scale_Add` | Lip | Vertex | — |
| 87 | `齶右` | `C_ZR_Face` | Other | Vertex | — |
| 88 | `齶左` | `C_ZL_Face` | Other | Vertex | — |
| 89 | `齶前` | `C_Down_Face` | Other | Vertex | — |
| 90 | `齶上` | `C_Up_Face` | Other | Vertex | — |
| 91 | `鼻上` | `P_Nose_Up` | Other | Vertex | — |
| 92 | `鼻下` | `P_Nose_Down` | Other | Vertex | — |
| 93 | `口上` | `P_M_Up_Add` | Other | Vertex | — |
| 94 | `口下` | `P_M_Down_Add` | Other | Vertex | — |
| 95 | `口右` | `P_M_RMove_Add` | Other | Vertex | — |
| 96 | `口左` | `P_M_LMove_Add` | Other | Vertex | — |
| 97 | `唇中` | `P_M_MidPoint_Add` | Other | Vertex | — |
| 98 | `口角前` | `P_M_UpDownView_Add` | Other | Vertex | — |
| 99 | `星目` | `星目` | Other | Vertex | — |
| 100 | `星目2` | — | Other | Vertex | — |
| 101 | `はぁと` | — | Other | Vertex | — |
| 102 | `はぁと2` | — | Other | Vertex | — |
| 103 | `FaceRed` | `FaceRed` | Other | Vertex | — |
| 104 | `#` | `#` | Other | Vertex | — |
| 105 | `#2` | `#2` | Other | Vertex | — |
| 106 | `？` | `？` | Other | Vertex | — |
| 107 | `！` | `！` | Other | Vertex | — |
| 108 | `ZZZ` | `ZZZ` | Other | Vertex | — |
| 109 | `汗` | `汗` | Other | Vertex | — |
| 110 | `はちゅ` | `はちゅ` | Other | Vertex | — |
| 111 | `惊` | `惊` | Other | Vertex | — |
| 112 | `……` | `……` | Other | Vertex | — |
| 113 | `照れ` | `照れ` | Other | Vertex | — |
| 114 | `照れ2` | `照れ2` | Other | Vertex | — |
| 115 | `涙` | `涙` | Other | Vertex | — |
| 116 | `鞋` | — | Other | Material | — |
| 117 | `发` | — | Other | Material | — |

<a id="model-12"></a>
### 12. Carlotta

- Format: PMX
- Asset path: `ww/chars/Carlotta/DarkCarlotta/Carlotta.pmx`
- Embedded name: `鳴潮_black Carlotta`
- Embedded English name: `New MMD Model`
- Cache file: `4f8a4e60fbca76418593dc8483c6f143fb768a7df9114efb21e828a8b2cca86a.asset`
- Morph counts: Eye: 28, Eyebrow: 25, Lip: 43, Other: 52, System: 16; total: 164.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `真面目` | — | Eyebrow | Vertex | — |
| 1 | `真面目L` | — | Eyebrow | Vertex | — |
| 2 | `真面目R` | — | Eyebrow | Vertex | — |
| 3 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 4 | `怒りL` | `B_Anger` | Eyebrow | Vertex | — |
| 5 | `怒りR` | `B_Anger` | Eyebrow | Vertex | — |
| 6 | `にこり` | `B_Happy` | Eyebrow | Vertex | — |
| 7 | `にこりL` | `B_Happy` | Eyebrow | Vertex | — |
| 8 | `にこりR` | `B_Happy` | Eyebrow | Vertex | — |
| 9 | `にこり2` | `B_Cheerful` | Eyebrow | Vertex | — |
| 10 | `困る` | `B_Sad` | Eyebrow | Vertex | sad |
| 11 | `困るL` | `B_Sad` | Eyebrow | Vertex | — |
| 12 | `困るR` | `B_Sad` | Eyebrow | Vertex | — |
| 13 | `平行` | `B_Flat` | Eyebrow | Vertex | — |
| 14 | `怪訝右` | `B_AH_R` | Eyebrow | Vertex | — |
| 15 | `怪訝左` | `B_AH_L` | Eyebrow | Vertex | — |
| 16 | `眉下2` | `S_08` | Eyebrow | Vertex | — |
| 17 | `左眉下` | `S_10` | Eyebrow | Vertex | — |
| 18 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 19 | `上L` | `B_Up_Add` | Eyebrow | Vertex | — |
| 20 | `上R` | `B_Up_Add` | Eyebrow | Vertex | — |
| 21 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 22 | `下L` | `B_Down_Add` | Eyebrow | Vertex | — |
| 23 | `下R` | `B_Down_Add` | Eyebrow | Vertex | — |
| 24 | `中` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 25 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 26 | `笑い` | — | Eye | Vertex | smileEyes |
| 27 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 28 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 29 | `ウィンク２` | `E_Close` | Eye | Vertex | — |
| 30 | `ｳｨﾝｸ２右` | `E_Close` | Eye | Vertex | — |
| 31 | `ｷﾘｯ` | `E_Anger` | Eye | Vertex | — |
| 32 | `なごみ` | — | Eye | Vertex | — |
| 33 | `なごみL` | — | Eye | Vertex | — |
| 34 | `なごみR` | — | Eye | Vertex | — |
| 35 | `はぅ` | — | Eye | Vertex | — |
| 36 | `はちゅ目` | — | Eye | Vertex | — |
| 37 | `垂れ目` | `E_Sad` | Eye | Vertex | — |
| 38 | `笑い目` | `E_Blephar` | Eye | Vertex | — |
| 39 | `じと目2` | `E_Focus` | Eye | Vertex | — |
| 40 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 41 | `じと目L` | `E_Insipid` | Eye | Vertex | — |
| 42 | `じと目R` | `E_Insipid` | Eye | Vertex | — |
| 43 | `up` | `Pupil_Up` | Eye | Vertex | — |
| 44 | `down` | `Pupil_Down` | Eye | Vertex | — |
| 45 | `right` | `Pupil_R` | Eye | Vertex | — |
| 46 | `left` | `Pupil_L` | Eye | Vertex | — |
| 47 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 48 | `瞳小L` | `Pupil_Scale` | Eye | Vertex | — |
| 49 | `瞳小R` | `Pupil_Scale` | Eye | Vertex | — |
| 50 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 51 | `あ` | `A` | Lip | Vertex | a |
| 52 | `い` | `S_03` | Lip | Vertex | i |
| 53 | `う` | `U` | Lip | Vertex | u |
| 54 | `え` | `E` | Lip | Vertex | e |
| 55 | `お` | `O` | Lip | Vertex | o |
| 56 | `口` | `Aa` | Lip | Vertex | — |
| 57 | `ぺろっ` | — | Lip | Vertex | — |
| 58 | `にやり` | — | Lip | Vertex | smile |
| 59 | `∧` | — | Lip | Vertex | — |
| 60 | `口角上げ` | — | Lip | Vertex | — |
| 61 | `口角下げ` | — | Lip | Vertex | — |
| 62 | `口横狭め` | `P_M_Scale_Add` | Lip | Vertex | — |
| 63 | `口横広げ` | — | Lip | Vertex | — |
| 64 | `右口角上げ` | `M_Smile_R` | Lip | Vertex | — |
| 65 | `左口角上げ` | `M_Smile_L` | Lip | Vertex | — |
| 66 | `右口角下げ` | `M_Ennui_R` | Lip | Vertex | — |
| 67 | `左口角下げ` | `M_Ennui_L` | Lip | Vertex | — |
| 68 | `い3` | `M_OpenSmall` | Lip | Vertex | — |
| 69 | `いい` | `M_Laugh` | Lip | Vertex | — |
| 70 | `いい２` | `I` | Lip | Vertex | — |
| 71 | `д` | `M_Scared` | Lip | Vertex | — |
| 72 | `い2` | `M_ScaredTooth` | Lip | Vertex | — |
| 73 | `(○｀ε´○)` | `M_Anger` | Lip | Vertex | — |
| 74 | `あ２` | `M_Trapezoid` | Lip | Vertex | — |
| 75 | `お2` | `M_O` | Lip | Vertex | — |
| 76 | `あ3` | `M_A` | Lip | Vertex | — |
| 77 | `M` | `M_Nutcracker` | Lip | Vertex | — |
| 78 | `口上` | `P_M_Up_Add` | Lip | Vertex | — |
| 79 | `口下` | `P_M_Down_Add` | Lip | Vertex | — |
| 80 | `口右` | `P_M_RMove_Add` | Lip | Vertex | — |
| 81 | `口左` | `P_M_LMove_Add` | Lip | Vertex | — |
| 82 | `lip thin` | `P_M_MidPoint_Add` | Lip | Vertex | — |
| 83 | `口後` | `P_M_UpDownView_Add` | Lip | Vertex | — |
| 84 | `右口横広げ` | `P_M_R_Add` | Lip | Vertex | — |
| 85 | `左口横広げ` | `P_M_L_Add` | Lip | Vertex | — |
| 86 | `右口角上げ2` | `P_M_ZR_Add` | Lip | Vertex | — |
| 87 | `左口角上げ2` | `P_M_ZL_Add` | Lip | Vertex | — |
| 88 | `え2` | `S_01` | Lip | Vertex | — |
| 89 | `え3` | `S_02` | Lip | Vertex | — |
| 90 | `う２` | `S_04` | Lip | Vertex | — |
| 91 | `口角下げ2` | `S_05` | Lip | Vertex | — |
| 92 | `lip behind` | `S_06` | Lip | Vertex | — |
| 93 | `lip thick` | `C_M_Distant` | Lip | Vertex | — |
| 94 | `右face` | `C_ZR_Face` | Other | Vertex | — |
| 95 | `左face` | `C_ZL_Face` | Other | Vertex | — |
| 96 | `下巴下` | `C_Down_Face` | Other | Vertex | — |
| 97 | `下巴上` | `C_Up_Face` | Other | Vertex | — |
| 98 | `鼻上` | `P_Nose_Up` | Other | Vertex | — |
| 99 | `鼻下` | `P_Nose_Down` | Other | Vertex | — |
| 100 | `L_P` | `L_P` | Other | Vertex | — |
| 101 | `L_F` | `L_F` | Other | Vertex | — |
| 102 | `L_B` | `L_B` | Other | Vertex | — |
| 103 | `L_F_U` | `L_F_U` | Other | Vertex | — |
| 104 | `L_B_U` | `L_B_U` | Other | Vertex | — |
| 105 | `L_Up` | `L_Up` | Other | Vertex | — |
| 106 | `L_Up_U` | `L_Up_U` | Other | Vertex | — |
| 107 | `R_P` | `R_P` | Other | Vertex | — |
| 108 | `R_F` | `R_F` | Other | Vertex | — |
| 109 | `R_B` | `R_B` | Other | Vertex | — |
| 110 | `R_F_U` | `R_F_U` | Other | Vertex | — |
| 111 | `R_B_U` | `R_B_U` | Other | Vertex | — |
| 112 | `R_Up` | `R_Up` | Other | Vertex | — |
| 113 | `R_Up_U` | `R_Up_U` | Other | Vertex | — |
| 114 | `照れ` | — | Other | Vertex | — |
| 115 | `照れ2` | — | Other | Vertex | — |
| 116 | `星目` | — | Eye | Vertex | — |
| 117 | `はぁと` | — | Eye | Vertex | — |
| 118 | `eye al` | — | Other | Material | — |
| 119 | `eye hi al` | — | Other | Material | — |
| 120 | `eye hi off` | — | Other | Material | — |
| 121 | `eye off` | — | Other | Material | — |
| 122 | `見開く` | — | Other | Group | — |
| 123 | `にこりB` | — | Other | Group | — |
| 124 | `困るB` | — | Other | Group | — |
| 125 | `怒りB` | — | Other | Group | — |
| 126 | `にこりA` | — | Other | Group | — |
| 127 | `真面目A` | — | Other | Group | — |
| 128 | `困るA` | — | Other | Group | — |
| 129 | `怒りA` | — | Other | Group | — |
| 130 | `笑いA` | — | Other | Group | — |
| 131 | `まばたきA` | — | Other | Group | — |
| 132 | `寄り目` | — | Other | Bone | — |
| 133 | `+目下` | — | Other | Bone | — |
| 134 | `+目上` | — | Other | Bone | — |
| 135 | `emo3左` | — | System | Vertex | — |
| 136 | `emo3右` | — | System | Vertex | — |
| 137 | `emo3上` | — | System | Vertex | — |
| 138 | `nu` | — | System | UV | — |
| 139 | `haha` | — | System | UV | — |
| 140 | `han` | — | System | UV | — |
| 141 | `xin` | — | System | UV | — |
| 142 | `jing` | — | System | UV | — |
| 143 | `heixian` | — | System | UV | — |
| 144 | `wenhao` | — | System | UV | — |
| 145 | `handi` | — | System | UV | — |
| 146 | `jingtanhao` | — | System | UV | — |
| 147 | `zhuyi` | — | System | UV | — |
| 148 | `luanma` | — | System | UV | — |
| 149 | `keshui` | — | System | UV | — |
| 150 | `shenluehao` | — | System | UV | — |
| 151 | `(#｀皿´)` | — | Other | Group | — |
| 152 | `O(∩_∩)O` | — | Other | Group | — |
| 153 | `(-ω-；)` | — | Other | Group | — |
| 154 | `喜(=゜ω゜)ノ` | — | Other | Group | — |
| 155 | `∑(´△｀)！` | — | Other | Group | — |
| 156 | `-﹏-&#124;&#124;&#124;` | — | Other | Group | — |
| 157 | `[・_・?]` | — | Other | Group | — |
| 158 | `(｡ω｡；)` | — | Other | Group | — |
| 159 | `(´△｀)！` | — | Other | Group | — |
| 160 | `d(^^*)` | — | Other | Group | — |
| 161 | `彡(-_-;)彡` | — | Other | Group | — |
| 162 | `(。-ω-)zzz` | — | Other | Group | — |
| 163 | `(¬_¬)ﾉ…` | — | Other | Group | — |

<a id="model-13"></a>
### 13. Carole Arna

- Format: PMX
- Asset path: `zzz/chars/Carole Arna/Carole Arna.pmx`
- Embedded name: `NPC_Carole_Model`
- Embedded English name: `NPC_Carole_Model`
- Cache file: `39fc795f3b832c63347ea38ac2e01331f396ec3f8cd3b80830698d91043ac04c.asset`
- Morph counts: Other: 30; total: 30.
- Unmatched app channels: `a`, `i`, `u`, `e`, `o`, `blink`, `smileEyes`, `smile`, `sad`, `angry`, `surprised`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `0003_Carole_Eyebrow_morph0` | `0003_Carole_Eyebrow_morph0` | Other | Vertex | — |
| 1 | `0003_Carole_Eyebrow_morph1` | `0003_Carole_Eyebrow_morph1` | Other | Vertex | — |
| 2 | `0003_Carole_Eyebrow_morph2` | `0003_Carole_Eyebrow_morph2` | Other | Vertex | — |
| 3 | `0004_Carole_Face_morph0` | `0004_Carole_Face_morph0` | Other | Vertex | — |
| 4 | `0004_Carole_Face_morph1` | `0004_Carole_Face_morph1` | Other | Vertex | — |
| 5 | `0004_Carole_Face_morph2` | `0004_Carole_Face_morph2` | Other | Vertex | — |
| 6 | `0004_Carole_Face_morph3` | `0004_Carole_Face_morph3` | Other | Vertex | — |
| 7 | `0004_Carole_Face_morph4` | `0004_Carole_Face_morph4` | Other | Vertex | — |
| 8 | `0004_Carole_Face_morph5` | `0004_Carole_Face_morph5` | Other | Vertex | — |
| 9 | `0004_Carole_Face_morph6` | `0004_Carole_Face_morph6` | Other | Vertex | — |
| 10 | `0004_Carole_Face_morph7` | `0004_Carole_Face_morph7` | Other | Vertex | — |
| 11 | `0004_Carole_Face_morph8` | `0004_Carole_Face_morph8` | Other | Vertex | — |
| 12 | `0004_Carole_Face_morph9` | `0004_Carole_Face_morph9` | Other | Vertex | — |
| 13 | `0004_Carole_Face_morph10` | `0004_Carole_Face_morph10` | Other | Vertex | — |
| 14 | `0004_Carole_Face_morph11` | `0004_Carole_Face_morph11` | Other | Vertex | — |
| 15 | `0004_Carole_Face_morph12` | `0004_Carole_Face_morph12` | Other | Vertex | — |
| 16 | `0004_Carole_Face_morph13` | `0004_Carole_Face_morph13` | Other | Vertex | — |
| 17 | `0004_Carole_Face_morph14` | `0004_Carole_Face_morph14` | Other | Vertex | — |
| 18 | `0004_Carole_Face_morph15` | `0004_Carole_Face_morph15` | Other | Vertex | — |
| 19 | `0004_Carole_Face_morph16` | `0004_Carole_Face_morph16` | Other | Vertex | — |
| 20 | `0004_Carole_Face_morph17` | `0004_Carole_Face_morph17` | Other | Vertex | — |
| 21 | `0004_Carole_Face_morph18` | `0004_Carole_Face_morph18` | Other | Vertex | — |
| 22 | `0004_Carole_Face_morph19` | `0004_Carole_Face_morph19` | Other | Vertex | — |
| 23 | `0004_Carole_Face_morph20` | `0004_Carole_Face_morph20` | Other | Vertex | — |
| 24 | `0004_Carole_Face_morph21` | `0004_Carole_Face_morph21` | Other | Vertex | — |
| 25 | `0004_Carole_Face_morph22` | `0004_Carole_Face_morph22` | Other | Vertex | — |
| 26 | `0004_Carole_Face_morph23` | `0004_Carole_Face_morph23` | Other | Vertex | — |
| 27 | `0004_Carole_Face_morph24` | `0004_Carole_Face_morph24` | Other | Vertex | — |
| 28 | `0004_Carole_Face_morph25` | `0004_Carole_Face_morph25` | Other | Vertex | — |
| 29 | `0004_Carole_Face_morph26` | `0004_Carole_Face_morph26` | Other | Vertex | — |

<a id="model-14"></a>
### 14. Cartethyia

- Format: PMX
- Asset path: `ww/chars/Cartethyia/Fleurdelys/Fleurdelys.pmx`
- Embedded name: `芙露德利斯`
- Embedded English name: `芙露德利斯`
- Cache file: `299040a27dcad681e7915493e84428548c40bb2254f313347694d61f02e4e427.asset`
- Morph counts: Eye: 42, Eyebrow: 24, Lip: 25, Other: 30; total: 121.
- Unmatched app channels: `smile`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `困る` | `B_Sad` | Eyebrow | Vertex | sad |
| 1 | `困る左` | — | Eyebrow | Vertex | — |
| 2 | `困る右` | — | Eyebrow | Vertex | — |
| 3 | `にこり` | `B_Happy` | Eyebrow | Vertex | — |
| 4 | `にこり左` | — | Eyebrow | Vertex | — |
| 5 | `にこり右` | — | Eyebrow | Vertex | — |
| 6 | `にこり２` | `B_Cheerful` | Eyebrow | Vertex | — |
| 7 | `にこり２右` | — | Eyebrow | Vertex | — |
| 8 | `にこり２左` | — | Eyebrow | Vertex | — |
| 9 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 10 | `怒り左` | — | Eyebrow | Vertex | — |
| 11 | `怒り右` | — | Eyebrow | Vertex | — |
| 12 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 13 | `上左` | — | Eyebrow | Vertex | — |
| 14 | `上右` | — | Eyebrow | Vertex | — |
| 15 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 16 | `下左` | — | Eyebrow | Vertex | — |
| 17 | `下右` | — | Eyebrow | Vertex | — |
| 18 | `平行` | `B_Flat` | Eyebrow | Vertex | — |
| 19 | `平行左` | — | Eyebrow | Vertex | — |
| 20 | `平行右` | — | Eyebrow | Vertex | — |
| 21 | `入` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 22 | `入左` | — | Eyebrow | Vertex | — |
| 23 | `入右` | — | Eyebrow | Vertex | — |
| 24 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 25 | `ウィンク２` | — | Eye | Vertex | — |
| 26 | `ウィンク２右` | — | Eye | Vertex | — |
| 27 | `笑い` | — | Eye | Vertex | smileEyes |
| 28 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 29 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 30 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 31 | `じと目左` | — | Eye | Vertex | — |
| 32 | `じと目右` | — | Eye | Vertex | — |
| 33 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 34 | `びっくり左` | — | Eye | Vertex | — |
| 35 | `びっくり右` | — | Eye | Vertex | — |
| 36 | `キリッ` | `E_Anger` | Eye | Vertex | — |
| 37 | `キリッ左` | — | Eye | Vertex | — |
| 38 | `キリッ右` | — | Eye | Vertex | — |
| 39 | `たれ目` | `E_Focus` | Eye | Vertex | — |
| 40 | `たれ目左` | — | Eye | Vertex | — |
| 41 | `たれ目右` | — | Eye | Vertex | — |
| 42 | `笑い目` | `E_Blephar` | Eye | Vertex | — |
| 43 | `笑い目左` | — | Eye | Vertex | — |
| 44 | `笑い目右` | — | Eye | Vertex | — |
| 45 | `悲しい目` | `E_Sad` | Eye | Vertex | — |
| 46 | `悲しい目左` | — | Eye | Vertex | — |
| 47 | `悲しい目右` | — | Eye | Vertex | — |
| 48 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 49 | `瞳小左` | — | Eye | Vertex | — |
| 50 | `瞳小右` | — | Eye | Vertex | — |
| 51 | `恐ろしい子！` | `恐ろしい子！` | Eye | Vertex | — |
| 52 | `恐ろしい子！左` | — | Eye | Vertex | — |
| 53 | `恐ろしい子！右` | — | Eye | Vertex | — |
| 54 | `ハイライト消` | `ハイライト消` | Eye | Vertex | — |
| 55 | `ハイライト消左` | — | Eye | Vertex | — |
| 56 | `ハイライト消右` | — | Eye | Vertex | — |
| 57 | `カメラ目` | `カメラ目` | Eye | Vertex | — |
| 58 | `Up` | `Pupil_Up` | Eye | Vertex | — |
| 59 | `Down` | `Pupil_Down` | Eye | Vertex | — |
| 60 | `Right` | `Pupil_R` | Eye | Vertex | — |
| 61 | `Left` | `Pupil_L` | Eye | Vertex | — |
| 62 | `あ` | `A` | Lip | Vertex | a |
| 63 | `あ２` | `Aa` | Lip | Vertex | — |
| 64 | `ああ` | `M_Trapezoid` | Lip | Vertex | — |
| 65 | `い` | `I` | Lip | Vertex | i |
| 66 | `い２` | `M_ScaredTooth` | Lip | Vertex | — |
| 67 | `う` | `U` | Lip | Vertex | u |
| 68 | `う２` | `M_OpenSmall` | Lip | Vertex | — |
| 69 | `え` | `E` | Lip | Vertex | e |
| 70 | `お` | `O` | Lip | Vertex | o |
| 71 | `お２` | `M_O` | Lip | Vertex | — |
| 72 | `ワ` | `M_Laugh` | Lip | Vertex | — |
| 73 | `ん` | `M_Anger` | Lip | Vertex | — |
| 74 | `ん２` | `C_M_Distant` | Lip | Vertex | — |
| 75 | `∧` | `M_Nutcracker` | Lip | Vertex | — |
| 76 | `□` | `M_A` | Lip | Vertex | — |
| 77 | `なんで` | `M_Scared` | Lip | Vertex | — |
| 78 | `口角下げ左` | `M_Ennui_L` | Lip | Vertex | — |
| 79 | `口角下げ右` | `M_Ennui_R` | Lip | Vertex | — |
| 80 | `口角上げ左` | `M_Smile_L` | Lip | Vertex | — |
| 81 | `口角上げ右` | `M_Smile_R` | Lip | Vertex | — |
| 82 | `口横広げ左` | `P_M_L_Add` | Lip | Vertex | — |
| 83 | `口横広げ右` | `P_M_R_Add` | Lip | Vertex | — |
| 84 | `口横広げ2右` | `P_M_ZR_Add` | Lip | Vertex | — |
| 85 | `口横広げ2左` | `P_M_ZL_Add` | Lip | Vertex | — |
| 86 | `口横縮小` | `P_M_Scale_Add` | Lip | Vertex | — |
| 87 | `齶右` | `C_ZR_Face` | Other | Vertex | — |
| 88 | `齶左` | `C_ZL_Face` | Other | Vertex | — |
| 89 | `齶前` | `C_Down_Face` | Other | Vertex | — |
| 90 | `齶上` | `C_Up_Face` | Other | Vertex | — |
| 91 | `鼻上` | `P_Nose_Up` | Other | Vertex | — |
| 92 | `鼻下` | `P_Nose_Down` | Other | Vertex | — |
| 93 | `口上` | `P_M_Up_Add` | Other | Vertex | — |
| 94 | `口下` | `P_M_Down_Add` | Other | Vertex | — |
| 95 | `口右` | `P_M_RMove_Add` | Other | Vertex | — |
| 96 | `口左` | `P_M_LMove_Add` | Other | Vertex | — |
| 97 | `唇中` | `P_M_MidPoint_Add` | Other | Vertex | — |
| 98 | `口角前` | `P_M_UpDownView_Add` | Other | Vertex | — |
| 99 | `FaceRed` | `FaceRed` | Other | Vertex | — |
| 100 | `#` | `#` | Other | Vertex | — |
| 101 | `#2` | `#2` | Other | Vertex | — |
| 102 | `？` | `？` | Other | Vertex | — |
| 103 | `！` | `！` | Other | Vertex | — |
| 104 | `ZZZ` | `ZZZ` | Other | Vertex | — |
| 105 | `汗` | `汗` | Other | Vertex | — |
| 106 | `はちゅ` | `はちゅ` | Other | Vertex | — |
| 107 | `惊` | `惊` | Other | Vertex | — |
| 108 | `……` | `……` | Other | Vertex | — |
| 109 | `星目` | `星目` | Eye | Vertex | — |
| 110 | `星目2` | `星目2` | Eye | Vertex | — |
| 111 | `はぁと` | `はぁと` | Eye | Vertex | — |
| 112 | `はぁと2` | `はぁと2` | Eye | Vertex | — |
| 113 | `照れ` | `照れ` | Other | Vertex | — |
| 114 | `照れ2` | `照れ2` | Other | Vertex | — |
| 115 | `涙` | `涙` | Other | Vertex | — |
| 116 | `黒化` | `黒化` | Other | Material | — |
| 117 | `白化` | `白化` | Other | Material | — |
| 118 | `透過` | `透過` | Other | Material | — |
| 119 | `轮廓线OFF` | — | Other | Material | — |
| 120 | `spa深` | — | Other | Material | — |

<a id="model-15"></a>
### 15. Changli

- Format: PMX
- Asset path: `ww/chars/Changli/Changli/Changli.pmx`
- Embedded name: `长离`
- Embedded English name: `New MMD Model`
- Cache file: `ef59c302c161ccdf3369996ef457fb0ed6b8160538d1c5424d34cd5d704aa648.asset`
- Morph counts: Eye: 38, Eyebrow: 24, Lip: 36, Other: 20; total: 118.
- Unmatched app channels: `smile`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `困る` | `B_Sad` | Eyebrow | Vertex | sad |
| 1 | `困る左` | `B_Sad` | Eyebrow | Vertex | — |
| 2 | `困る右` | `B_Sad` | Eyebrow | Vertex | — |
| 3 | `にこり` | `B_Happy` | Eyebrow | Vertex | — |
| 4 | `にこり左` | `B_Happy` | Eyebrow | Vertex | — |
| 5 | `にこり右` | `B_Happy` | Eyebrow | Vertex | — |
| 6 | `にこり２` | `B_Cheerful` | Eyebrow | Vertex | — |
| 7 | `にこり２左` | `B_Cheerful` | Eyebrow | Vertex | — |
| 8 | `にこり２右` | `B_Cheerful` | Eyebrow | Vertex | — |
| 9 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 10 | `怒り左` | `B_AH_L` | Eyebrow | Vertex | — |
| 11 | `怒り右` | `B_AH_R` | Eyebrow | Vertex | — |
| 12 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 13 | `上左` | `B_Up_Add` | Eyebrow | Vertex | — |
| 14 | `上右` | `B_Up_Add` | Eyebrow | Vertex | — |
| 15 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 16 | `下左` | `B_Down_Add` | Eyebrow | Vertex | — |
| 17 | `下右` | `B_Down_Add` | Eyebrow | Vertex | — |
| 18 | `平行` | `B_Flat` | Eyebrow | Vertex | — |
| 19 | `平行左` | `B_Flat` | Eyebrow | Vertex | — |
| 20 | `平行右` | `B_Flat` | Eyebrow | Vertex | — |
| 21 | `入` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 22 | `入左` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 23 | `入右` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 24 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 25 | `まばたき左` | `E_Close` | Eye | Vertex | — |
| 26 | `まばたき右` | `E_Close` | Eye | Vertex | — |
| 27 | `笑い` | `E_Smile_L` | Eye | Vertex | smileEyes |
| 28 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 29 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 30 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 31 | `じと目左` | `E_Insipid` | Eye | Vertex | — |
| 32 | `じと目右` | `E_Insipid` | Eye | Vertex | — |
| 33 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 34 | `びっくり左` | `E_Stare` | Eye | Vertex | — |
| 35 | `びっくり右` | `E_Stare` | Eye | Vertex | — |
| 36 | `キリッ` | `E_Anger` | Eye | Vertex | — |
| 37 | `キリッ左` | `E_Anger` | Eye | Vertex | — |
| 38 | `キリッ右` | `E_Anger` | Eye | Vertex | — |
| 39 | `たれ目` | `E_Focus` | Eye | Vertex | — |
| 40 | `たれ目左` | `E_Focus` | Eye | Vertex | — |
| 41 | `たれ目右` | `E_Focus` | Eye | Vertex | — |
| 42 | `笑い目` | `E_Blephar` | Eye | Vertex | — |
| 43 | `笑い目左` | `E_Blephar` | Eye | Vertex | — |
| 44 | `笑い目右` | `E_Blephar` | Eye | Vertex | — |
| 45 | `悲しい目` | `E_Sad` | Eye | Vertex | — |
| 46 | `悲しい目左` | `E_Sad` | Eye | Vertex | — |
| 47 | `悲しい目右` | `E_Sad` | Eye | Vertex | — |
| 48 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 49 | `瞳小左` | `Pupil_Scale` | Eye | Vertex | — |
| 50 | `瞳小右` | `Pupil_Scale` | Eye | Vertex | — |
| 51 | `カメラ目` | — | Eye | Vertex | — |
| 52 | `恐ろしい子！` | — | Eye | Vertex | — |
| 53 | `恐ろしい子！左` | — | Eye | Vertex | — |
| 54 | `恐ろしい子！右` | — | Eye | Vertex | — |
| 55 | `ハイライト消` | — | Eye | Vertex | — |
| 56 | `ハイライト消左` | — | Eye | Vertex | — |
| 57 | `ハイライト消右` | — | Eye | Vertex | — |
| 58 | `Up` | `Pupil_Up` | Eye | Vertex | — |
| 59 | `Down` | `Pupil_Down` | Eye | Vertex | — |
| 60 | `Right` | `Pupil_R` | Eye | Vertex | — |
| 61 | `Left` | `Pupil_L` | Eye | Vertex | — |
| 62 | `あ` | `A` | Lip | Vertex | a |
| 63 | `あ２` | `Aa` | Lip | Vertex | — |
| 64 | `ああ` | `M_Trapezoid` | Lip | Vertex | — |
| 65 | `い` | `I` | Lip | Vertex | i |
| 66 | `いい` | `S_01` | Lip | Vertex | — |
| 67 | `い２` | `M_ScaredTooth` | Lip | Vertex | — |
| 68 | `う` | `U` | Lip | Vertex | u |
| 69 | `う２` | `M_OpenSmall` | Lip | Vertex | — |
| 70 | `え` | `E` | Lip | Vertex | e |
| 71 | `お` | `O` | Lip | Vertex | o |
| 72 | `お２` | `M_O` | Lip | Vertex | — |
| 73 | `ワ` | `M_Laugh` | Lip | Vertex | — |
| 74 | `ん` | `M_Anger` | Lip | Vertex | — |
| 75 | `ん２` | `C_M_Distant` | Lip | Vertex | — |
| 76 | `∧` | `M_Nutcracker` | Lip | Vertex | — |
| 77 | `□` | `M_A` | Lip | Vertex | — |
| 78 | `なんで` | `M_Scared` | Lip | Vertex | — |
| 79 | `口角下げ左` | `M_Ennui_L` | Lip | Vertex | — |
| 80 | `口角下げ右` | `M_Ennui_R` | Lip | Vertex | — |
| 81 | `口角上げ左` | `M_Smile_L` | Lip | Vertex | — |
| 82 | `口角上げ右` | `M_Smile_R` | Lip | Vertex | — |
| 83 | `口横広げ左` | `P_M_L_Add` | Lip | Vertex | — |
| 84 | `口横広げ右` | `P_M_R_Add` | Lip | Vertex | — |
| 85 | `口横広げ2右` | `P_M_ZR_Add` | Lip | Vertex | — |
| 86 | `口横広げ2左` | `P_M_ZL_Add` | Lip | Vertex | — |
| 87 | `口横縮小` | `P_M_Scale_Add` | Lip | Vertex | — |
| 88 | `齶右` | `C_ZR_Face` | Lip | Vertex | — |
| 89 | `齶左` | `C_ZL_Face` | Lip | Vertex | — |
| 90 | `齶前` | `C_Down_Face` | Lip | Vertex | — |
| 91 | `齶上` | `C_Up_Face` | Lip | Vertex | — |
| 92 | `口上` | `P_M_Up_Add` | Lip | Vertex | — |
| 93 | `口下` | `P_M_Down_Add` | Lip | Vertex | — |
| 94 | `口右` | `P_M_RMove_Add` | Lip | Vertex | — |
| 95 | `口左` | `P_M_LMove_Add` | Lip | Vertex | — |
| 96 | `唇中` | `P_M_MidPoint_Add` | Lip | Vertex | — |
| 97 | `口角前` | `P_M_UpDownView_Add` | Lip | Vertex | — |
| 98 | `鼻上` | `P_Nose_Up` | Other | Vertex | — |
| 99 | `鼻下` | `P_Nose_Down` | Other | Vertex | — |
| 100 | `FaceRed` | `键 68` | Other | Vertex | — |
| 101 | `星目` | `星目` | Other | Vertex | — |
| 102 | `星目2` | `星目2` | Other | Vertex | — |
| 103 | `はぁと` | `はぁと` | Other | Vertex | — |
| 104 | `はぁと2` | `はぁと2` | Other | Vertex | — |
| 105 | `#` | `#` | Other | Vertex | — |
| 106 | `#2` | — | Other | Vertex | — |
| 107 | `？` | `？` | Other | Vertex | — |
| 108 | `！` | `！` | Other | Vertex | — |
| 109 | `ZZZ` | `ZZZ` | Other | Vertex | — |
| 110 | `汗` | `汗` | Other | Vertex | — |
| 111 | `はちゅ` | `はちゅ` | Other | Vertex | — |
| 112 | `惊` | `惊` | Other | Vertex | — |
| 113 | `……` | `……` | Other | Vertex | — |
| 114 | `照れ` | `照れ` | Other | Vertex | — |
| 115 | `照れ2` | `照れ2` | Other | Vertex | — |
| 116 | `涙` | `涙` | Other | Vertex | — |
| 117 | `CoatOFF` | — | Other | Material | — |

<a id="model-16"></a>
### 16. Danjin

- Format: PMX
- Asset path: `ww/chars/Danjin/Danjin.pmx`
- Embedded name: `鳴潮_丹瑾`
- Embedded English name: `New MMD Model`
- Cache file: `209ce2a3384fe21d2b517e27d91fa4b7c82ea1853c8e45e4ebdd464236233076.asset`
- Morph counts: Eye: 28, Eyebrow: 23, Lip: 30, Other: 32; total: 113.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `真面目` | — | Eyebrow | Vertex | — |
| 1 | `真面目L` | — | Eyebrow | Vertex | — |
| 2 | `真面目R` | — | Eyebrow | Vertex | — |
| 3 | `中` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 4 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 5 | `怒りL` | `B_Anger` | Eyebrow | Vertex | — |
| 6 | `怒りR` | `B_Anger` | Eyebrow | Vertex | — |
| 7 | `にこり` | `B_Happy` | Eyebrow | Vertex | — |
| 8 | `にこりL` | `B_Happy` | Eyebrow | Vertex | — |
| 9 | `にこりR` | `B_Happy` | Eyebrow | Vertex | — |
| 10 | `にこり2` | `B_Cheerful` | Eyebrow | Vertex | — |
| 11 | `困る` | `B_Sad` | Eyebrow | Vertex | sad |
| 12 | `困るL` | `B_Sad` | Eyebrow | Vertex | — |
| 13 | `困るR` | `B_Sad` | Eyebrow | Vertex | — |
| 14 | `平行` | `B_Flat` | Eyebrow | Vertex | — |
| 15 | `怪訝右` | `B_AH_R` | Eyebrow | Vertex | — |
| 16 | `怪訝左` | `B_AH_L` | Eyebrow | Vertex | — |
| 17 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 18 | `上L` | `B_Up_Add` | Eyebrow | Vertex | — |
| 19 | `上R` | `B_Up_Add` | Eyebrow | Vertex | — |
| 20 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 21 | `下L` | `B_Down_Add` | Eyebrow | Vertex | — |
| 22 | `下R` | `B_Down_Add` | Eyebrow | Vertex | — |
| 23 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 24 | `笑い` | — | Eye | Vertex | smileEyes |
| 25 | `ウィンク` | — | Eye | Vertex | — |
| 26 | `ウィンク右` | — | Eye | Vertex | — |
| 27 | `ウィンク２` | `E_Close` | Eye | Vertex | — |
| 28 | `ｳｨﾝｸ２右` | `E_Close` | Eye | Vertex | — |
| 29 | `はぅ` | — | Eye | Vertex | — |
| 30 | `はちゅ目` | — | Eye | Vertex | — |
| 31 | `ｷﾘｯ` | `E_Anger` | Eye | Vertex | — |
| 32 | `なごみ` | — | Eye | Vertex | — |
| 33 | `なごみL` | — | Eye | Vertex | — |
| 34 | `なごみR` | — | Eye | Vertex | — |
| 35 | `垂れ目` | `E_Sad` | Eye | Vertex | — |
| 36 | `じと目2` | `E_Focus` | Eye | Vertex | — |
| 37 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 38 | `じと目L` | `E_Insipid` | Eye | Vertex | — |
| 39 | `じと目R` | `E_Insipid` | Eye | Vertex | — |
| 40 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 41 | `up` | `Pupil_Up` | Eye | Vertex | — |
| 42 | `down` | `Pupil_Down` | Eye | Vertex | — |
| 43 | `right` | `Pupil_R` | Eye | Vertex | — |
| 44 | `left` | `Pupil_L` | Eye | Vertex | — |
| 45 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 46 | `瞳小L` | `Pupil_Scale` | Eye | Vertex | — |
| 47 | `瞳小R` | `Pupil_Scale` | Eye | Vertex | — |
| 48 | `笑い目` | `E_Blephar` | Eye | Vertex | — |
| 49 | `口` | `Aa` | Lip | Vertex | — |
| 50 | `あ` | `A` | Lip | Vertex | a |
| 51 | `い` | `I` | Lip | Vertex | i |
| 52 | `う` | `U` | Lip | Vertex | u |
| 53 | `え` | `E` | Lip | Vertex | e |
| 54 | `お` | `O` | Lip | Vertex | o |
| 55 | `∧` | — | Lip | Vertex | — |
| 56 | `にやり` | — | Lip | Vertex | smile |
| 57 | `口角上げ` | — | Lip | Vertex | — |
| 58 | `口角下げ` | — | Lip | Vertex | — |
| 59 | `口横広げ` | — | Lip | Vertex | — |
| 60 | `ぺろっ` | — | Lip | Vertex | — |
| 61 | `右口角上げ` | `M_Smile_R` | Lip | Vertex | — |
| 62 | `左口角上げ` | `M_Smile_L` | Lip | Vertex | — |
| 63 | `右口角下げ` | `M_Ennui_R` | Lip | Vertex | — |
| 64 | `左口角下げ` | `M_Ennui_L` | Lip | Vertex | — |
| 65 | `い3` | `M_OpenSmall` | Lip | Vertex | — |
| 66 | `いい` | `M_Laugh` | Lip | Vertex | — |
| 67 | `д` | `M_Scared` | Lip | Vertex | — |
| 68 | `い2` | `M_ScaredTooth` | Lip | Vertex | — |
| 69 | `(○｀ε´○)` | `M_Anger` | Lip | Vertex | — |
| 70 | `あ２` | `M_Trapezoid` | Lip | Vertex | — |
| 71 | `お2` | `M_O` | Lip | Vertex | — |
| 72 | `あ3` | `M_A` | Lip | Vertex | — |
| 73 | `M` | `M_Nutcracker` | Lip | Vertex | — |
| 74 | `右口横広げ` | `P_M_R_Add` | Lip | Vertex | — |
| 75 | `左口横広げ` | `P_M_L_Add` | Lip | Vertex | — |
| 76 | `右口角上げ2` | `P_M_ZR_Add` | Lip | Vertex | — |
| 77 | `左口角上げ2` | `P_M_ZL_Add` | Lip | Vertex | — |
| 78 | `口横狭め` | `P_M_Scale_Add` | Lip | Vertex | — |
| 79 | `C_ZR_Face` | `C_ZR_Face` | Other | Vertex | — |
| 80 | `C_ZL_Face` | `C_ZL_Face` | Other | Vertex | — |
| 81 | `C_Down_Face` | `C_Down_Face` | Other | Vertex | — |
| 82 | `C_Up_Face` | `C_Up_Face` | Other | Vertex | — |
| 83 | `lip thick` | `C_M_Distant` | Other | Vertex | — |
| 84 | `P_Nose_Up` | `P_Nose_Up` | Other | Vertex | — |
| 85 | `P_Nose_Down` | `P_Nose_Down` | Other | Vertex | — |
| 86 | `P_M_Up_Add` | `P_M_Up_Add` | Other | Vertex | — |
| 87 | `P_M_Down_Add` | `P_M_Down_Add` | Other | Vertex | — |
| 88 | `P_M_RMove_Add` | `P_M_RMove_Add` | Other | Vertex | — |
| 89 | `P_M_LMove_Add` | `P_M_LMove_Add` | Other | Vertex | — |
| 90 | `P_M_MidPoint_Add` | `P_M_MidPoint_Add` | Other | Vertex | — |
| 91 | `P_M_UpDownView_Add` | `P_M_UpDownView_Add` | Other | Vertex | — |
| 92 | `照れ` | — | Other | Vertex | — |
| 93 | `照れ2` | — | Other | Vertex | — |
| 94 | `星目` | — | Eye | Vertex | — |
| 95 | `はぁと` | — | Eye | Vertex | — |
| 96 | `eye al` | — | Other | Material | — |
| 97 | `eye hi al` | — | Other | Material | — |
| 98 | `star al` | — | Other | Material | — |
| 99 | `eye hi off` | — | Other | Material | — |
| 100 | `見開く` | — | Other | Group | — |
| 101 | `にこりB` | — | Other | Group | — |
| 102 | `困るB` | — | Other | Group | — |
| 103 | `怒りB` | — | Other | Group | — |
| 104 | `にこりA` | — | Other | Group | — |
| 105 | `真面目A` | — | Other | Group | — |
| 106 | `困るA` | — | Other | Group | — |
| 107 | `怒りA` | — | Other | Group | — |
| 108 | `笑いA` | — | Other | Group | — |
| 109 | `まばたきA` | — | Other | Group | — |
| 110 | `寄り目` | — | Other | Bone | — |
| 111 | `+目下` | — | Other | Bone | — |
| 112 | `+目上` | — | Other | Bone | — |

<a id="model-17"></a>
### 17. Encore

- Format: PMX
- Asset path: `ww/chars/Encore/Encore.pmx`
- Embedded name: `鳴潮_安可1.1`
- Embedded English name: `New MMD Model`
- Cache file: `1eddf86b71e177fb79616c125f85d6ea7f424391b4a4b31b2675d6fce51c0103.asset`
- Morph counts: Eye: 28, Eyebrow: 23, Lip: 30, Other: 31; total: 112.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `真面目` | — | Eyebrow | Vertex | — |
| 1 | `真面目L` | — | Eyebrow | Vertex | — |
| 2 | `真面目R` | — | Eyebrow | Vertex | — |
| 3 | `中` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 4 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 5 | `怒りL` | `B_Anger` | Eyebrow | Vertex | — |
| 6 | `怒りR` | `B_Anger` | Eyebrow | Vertex | — |
| 7 | `にこり` | `B_Happy` | Eyebrow | Vertex | — |
| 8 | `にこりL` | `B_Happy` | Eyebrow | Vertex | — |
| 9 | `にこりR` | `B_Happy` | Eyebrow | Vertex | — |
| 10 | `にこり2` | `B_Cheerful` | Eyebrow | Vertex | — |
| 11 | `困る` | `B_Sad` | Eyebrow | Vertex | sad |
| 12 | `困るL` | `B_Sad` | Eyebrow | Vertex | — |
| 13 | `困るR` | `B_Sad` | Eyebrow | Vertex | — |
| 14 | `平行` | `B_Flat` | Eyebrow | Vertex | — |
| 15 | `怪訝右` | `B_AH_R` | Eyebrow | Vertex | — |
| 16 | `怪訝左` | `B_AH_L` | Eyebrow | Vertex | — |
| 17 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 18 | `上L` | `B_Up_Add` | Eyebrow | Vertex | — |
| 19 | `上R` | `B_Up_Add` | Eyebrow | Vertex | — |
| 20 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 21 | `下L` | `B_Down_Add` | Eyebrow | Vertex | — |
| 22 | `下R` | `B_Down_Add` | Eyebrow | Vertex | — |
| 23 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 24 | `笑い` | — | Eye | Vertex | smileEyes |
| 25 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 26 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 27 | `ウィンク２` | `E_Close` | Eye | Vertex | — |
| 28 | `ｳｨﾝｸ２右` | `E_Close` | Eye | Vertex | — |
| 29 | `はぅ` | — | Eye | Vertex | — |
| 30 | `はちゅ目` | — | Eye | Vertex | — |
| 31 | `なごみ` | — | Eye | Vertex | — |
| 32 | `なごみL` | — | Eye | Vertex | — |
| 33 | `なごみR` | — | Eye | Vertex | — |
| 34 | `ｷﾘｯ` | `E_Anger` | Eye | Vertex | — |
| 35 | `垂れ目` | `E_Sad` | Eye | Vertex | — |
| 36 | `じと目2` | `E_Focus` | Eye | Vertex | — |
| 37 | `up` | `Pupil_Up` | Eye | Vertex | — |
| 38 | `down` | `Pupil_Down` | Eye | Vertex | — |
| 39 | `right` | `Pupil_R` | Eye | Vertex | — |
| 40 | `left` | `Pupil_L` | Eye | Vertex | — |
| 41 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 42 | `瞳小L` | `Pupil_Scale` | Eye | Vertex | — |
| 43 | `瞳小R` | `Pupil_Scale` | Eye | Vertex | — |
| 44 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 45 | `じと目L` | `E_Insipid` | Eye | Vertex | — |
| 46 | `じと目R` | `E_Insipid` | Eye | Vertex | — |
| 47 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 48 | `笑い目` | `E_Blephar` | Eye | Vertex | — |
| 49 | `あ` | `A` | Lip | Vertex | a |
| 50 | `い` | `I` | Lip | Vertex | i |
| 51 | `う` | `U` | Lip | Vertex | u |
| 52 | `え` | `E` | Lip | Vertex | e |
| 53 | `お` | `O` | Lip | Vertex | o |
| 54 | `口` | `Aa` | Lip | Vertex | — |
| 55 | `にやり` | — | Lip | Vertex | smile |
| 56 | `∧` | — | Lip | Vertex | — |
| 57 | `右口角上げ` | `M_Smile_R` | Lip | Vertex | — |
| 58 | `左口角上げ` | `M_Smile_L` | Lip | Vertex | — |
| 59 | `右口角下げ` | `M_Ennui_R` | Lip | Vertex | — |
| 60 | `左口角下げ` | `M_Ennui_L` | Lip | Vertex | — |
| 61 | `口角上げ` | — | Lip | Vertex | — |
| 62 | `口角下げ` | — | Lip | Vertex | — |
| 63 | `口横広げ` | — | Lip | Vertex | — |
| 64 | `ぺろっ` | — | Lip | Vertex | — |
| 65 | `いい` | `M_Laugh` | Lip | Vertex | — |
| 66 | `д` | `M_Scared` | Lip | Vertex | — |
| 67 | `い2` | `M_ScaredTooth` | Lip | Vertex | — |
| 68 | `い3` | `M_OpenSmall` | Lip | Vertex | — |
| 69 | `(○｀ε´○)` | `M_Anger` | Lip | Vertex | — |
| 70 | `あ２` | `M_Trapezoid` | Lip | Vertex | — |
| 71 | `お2` | `M_O` | Lip | Vertex | — |
| 72 | `あ3` | `M_A` | Lip | Vertex | — |
| 73 | `M` | `M_Nutcracker` | Lip | Vertex | — |
| 74 | `口横狭め` | `P_M_Scale_Add` | Lip | Vertex | — |
| 75 | `右口横広げ` | `P_M_R_Add` | Lip | Vertex | — |
| 76 | `左口横広げ` | `P_M_L_Add` | Lip | Vertex | — |
| 77 | `右口角上げ2` | `P_M_ZR_Add` | Lip | Vertex | — |
| 78 | `左口角上げ2` | `P_M_ZL_Add` | Lip | Vertex | — |
| 79 | `C_ZR_Face` | `C_ZR_Face` | Other | Vertex | — |
| 80 | `C_ZL_Face` | `C_ZL_Face` | Other | Vertex | — |
| 81 | `C_Down_Face` | `C_Down_Face` | Other | Vertex | — |
| 82 | `C_Up_Face` | `C_Up_Face` | Other | Vertex | — |
| 83 | `lip thick` | `C_M_Distant` | Other | Vertex | — |
| 84 | `P_Nose_Up` | `P_Nose_Up` | Other | Vertex | — |
| 85 | `P_Nose_Down` | `P_Nose_Down` | Other | Vertex | — |
| 86 | `P_M_Up_Add` | `P_M_Up_Add` | Other | Vertex | — |
| 87 | `P_M_Down_Add` | `P_M_Down_Add` | Other | Vertex | — |
| 88 | `P_M_RMove_Add` | `P_M_RMove_Add` | Other | Vertex | — |
| 89 | `P_M_LMove_Add` | `P_M_LMove_Add` | Other | Vertex | — |
| 90 | `P_M_MidPoint_Add` | `P_M_MidPoint_Add` | Other | Vertex | — |
| 91 | `P_M_UpDownView_Add` | `P_M_UpDownView_Add` | Other | Vertex | — |
| 92 | `照れ` | — | Other | Vertex | — |
| 93 | `照れ2` | — | Other | Vertex | — |
| 94 | `星目` | — | Eye | Vertex | — |
| 95 | `はぁと` | — | Eye | Vertex | — |
| 96 | `eye al` | — | Other | Material | — |
| 97 | `eye hi al` | — | Other | Material | — |
| 98 | `eye hi off` | — | Other | Material | — |
| 99 | `見開く` | — | Other | Group | — |
| 100 | `にこりB` | — | Other | Group | — |
| 101 | `困るB` | — | Other | Group | — |
| 102 | `怒りB` | — | Other | Group | — |
| 103 | `にこりA` | — | Other | Group | — |
| 104 | `真面目A` | — | Other | Group | — |
| 105 | `困るA` | — | Other | Group | — |
| 106 | `怒りA` | — | Other | Group | — |
| 107 | `笑いA` | — | Other | Group | — |
| 108 | `まばたきA` | — | Other | Group | — |
| 109 | `寄り目` | — | Other | Bone | — |
| 110 | `+目下` | — | Other | Bone | — |
| 111 | `+目上` | — | Other | Bone | — |

<a id="model-18"></a>
### 18. Evelyn Chevalier

- Format: PMX
- Asset path: `zzz/chars/Evelyn Chevalier/Evelyn.pmx`
- Embedded name: `Evelyn`
- Embedded English name: `Evelyn`
- Cache file: `3600323d5ec052e8e557183eb0e72933a41e4ae4b900e5ac964ea7a353e1821c.asset`
- Morph counts: Eye: 14, Eyebrow: 8, Lip: 27; total: 49.
- Unmatched app channels: `surprised`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `まばたき` | `Fac_Eye_Close` | Eye | Vertex | blink |
| 1 | `ウィンク２` | `Fac_Eye_Close` | Eye | Vertex | — |
| 2 | `ｳｨﾝｸ２右` | `Fac_Eye_Close` | Eye | Vertex | — |
| 3 | `笑い` | `Fac_Eye_R_Wink` | Eye | Vertex | smileEyes |
| 4 | `ウィンク右` | `Fac_Eye_R_Wink` | Eye | Vertex | — |
| 5 | `ウィンク` | `Fac_Eye_L_Wink` | Eye | Vertex | — |
| 6 | `びっくり右` | `Fac_Eye_R_Open` | Eye | Vertex | — |
| 7 | `びっくり左` | `Fac_Eye_L_Open` | Eye | Vertex | — |
| 8 | `じと目` | `Fac_Eye_HalfClose` | Eye | Vertex | — |
| 9 | `怒り目２` | `Fac_Eye_MidDown` | Eye | Vertex | — |
| 10 | `怒り目` | `Fac_Eye_Angry` | Eye | Vertex | — |
| 11 | `悲しむ` | `Fac_Eye_Sad` | Eye | Vertex | — |
| 12 | `眼角下` | `Fac_Eye_MidUp` | Eye | Vertex | — |
| 13 | `下眼上` | `Fac_Eye_LowlidUp` | Eye | Vertex | — |
| 14 | `あ` | `Fac_Mth_Aa1` | Lip | Vertex | a |
| 15 | `い` | `Fac_Mth_Ii` | Lip | Vertex | i |
| 16 | `う` | `Fac_Mth_Uu` | Lip | Vertex | u |
| 17 | `え` | `Fac_Mth_Ee` | Lip | Vertex | e |
| 18 | `ワ` | `Fac_Mth_AaTalk` | Lip | Vertex | — |
| 19 | `お` | `Fac_Mth_UuOo` | Lip | Vertex | o |
| 20 | `お２` | `Fac_Mth_Oo` | Lip | Vertex | — |
| 21 | `い２` | `Fac_Mth_Laugh2` | Lip | Vertex | — |
| 22 | `齒上` | `Fac_Tooth_Up` | Lip | Vertex | — |
| 23 | `齒下` | `Fac_Tooth_Down` | Lip | Vertex | — |
| 24 | `口右` | `Fac_Mth_Right` | Lip | Vertex | — |
| 25 | `口左` | `Fac_Mth_Left` | Lip | Vertex | — |
| 26 | `口上` | `Fac_Mth_Up` | Lip | Vertex | — |
| 27 | `口下` | `Fac_Mth_Down` | Lip | Vertex | — |
| 28 | `口横広げ右` | `Fac_Mth_R_Out` | Lip | Vertex | — |
| 29 | `口横広げ左` | `Fac_Mth_L_Out` | Lip | Vertex | — |
| 30 | `口横狭め左` | `Fac_Mth_L_In` | Lip | Vertex | — |
| 31 | `口横狭め右` | `Fac_Mth_R_In` | Lip | Vertex | — |
| 32 | `口角下げ右` | `Fac_Mth_R_Down` | Lip | Vertex | — |
| 33 | `口角下げ左` | `Fac_Mth_L_Down` | Lip | Vertex | — |
| 34 | `口角上げ左` | `Fac_Mth_L_Up` | Lip | Vertex | — |
| 35 | `口角上げ右` | `Fac_Mth_R_Up` | Lip | Vertex | — |
| 36 | `口横広げ` | `Fac_Mth_R_Out` | Lip | Vertex | — |
| 37 | `口横狭め` | `Fac_Mth_L_In` | Lip | Vertex | — |
| 38 | `口角下げ` | `Fac_Mth_R_Down` | Lip | Vertex | — |
| 39 | `口角上げ` | `Fac_Mth_L_Up` | Lip | Vertex | — |
| 40 | `にやり` | `Fac_Mth_L_Up` | Lip | Vertex | smile |
| 41 | `怒り` | — | Eyebrow | Bone | angry |
| 42 | `真面目` | — | Eyebrow | Bone | — |
| 43 | `悲しい` | — | Eyebrow | Bone | sad |
| 44 | `困る` | — | Eyebrow | Bone | — |
| 45 | `上` | — | Eyebrow | Bone | — |
| 46 | `下` | — | Eyebrow | Bone | — |
| 47 | `手前` | — | Eyebrow | Bone | — |
| 48 | `怒り右` | — | Eyebrow | Bone | — |

<a id="model-19"></a>
### 19. Faruzan

- Format: PMX
- Asset path: `gi/chars/Faruzan/珐露珊.pmx`
- Embedded name: `Faruzan`
- Embedded English name: —
- Cache file: `57b9c2790b5b7f4d685470f2a1c337af693768a649f2951dc61e8eb3034049cf.asset`
- Morph counts: Eye: 18, Eyebrow: 22, Lip: 21, Other: 2; total: 63.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `あ` | `ow_Up_L` | Lip | Vertex | a |
| 1 | `い` | `ow_Up_R` | Lip | Vertex | i |
| 2 | `う` | `ow_Up_R` | Lip | Vertex | u |
| 3 | `え` | `ow_Up_R` | Lip | Vertex | e |
| 4 | `お` | `ow_Up_R` | Lip | Vertex | o |
| 5 | `にやり` | `ow_Down_L` | Lip | Vertex | smile |
| 6 | `ワ` | `ow_Down_R` | Lip | Vertex | — |
| 7 | `ん` | `ow_Squeeze_L` | Lip | Vertex | — |
| 8 | `い１` | `ow_Squeeze_R` | Lip | Vertex | — |
| 9 | `い２` | `e_Default` | Lip | Vertex | — |
| 10 | `あ２` | `e_WinkA_L` | Lip | Vertex | — |
| 11 | `にやり２` | `e_WinkA_R` | Lip | Vertex | — |
| 12 | `にやり３` | `e_WinkB_L` | Lip | Vertex | — |
| 13 | `ω` | `e_WinkB_R` | Lip | Vertex | — |
| 14 | `てへぺろ` | `e_WinkC_L` | Lip | Vertex | — |
| 15 | `ぺろっ` | `e_WinkC_R` | Lip | Vertex | — |
| 16 | `口角上げ` | `ow_Shy_R` | Lip | Vertex | — |
| 17 | `口角下げ` | `ow_Shy_R` | Lip | Vertex | — |
| 18 | `口横広げ` | `e_Ha` | Lip | Vertex | — |
| 19 | `口横狭め` | `e_Jito` | Lip | Vertex | — |
| 20 | `舌広げ` | `e_Wail` | Lip | Vertex | — |
| 21 | `真面目` | `kirtS R B02` | Eyebrow | Vertex | — |
| 22 | `困る` | `kirtS R B02` | Eyebrow | Vertex | sad |
| 23 | `にこり` | `owknotS R A41` | Eyebrow | Vertex | — |
| 24 | `怒り` | `kirtF R B02` | Eyebrow | Vertex | angry |
| 25 | `恥ずかしい` | `owknotF R A61` | Eyebrow | Vertex | — |
| 26 | `上` | `owknotF R A65` | Eyebrow | Vertex | — |
| 27 | `下` | `owknotF R A63` | Eyebrow | Vertex | — |
| 28 | `前` | `kirtF CF B03` | Eyebrow | Vertex | — |
| 29 | `困る左` | `kirtS R B02` | Eyebrow | Vertex | — |
| 30 | `困る右` | `kirtS R B03` | Eyebrow | Vertex | — |
| 31 | `にこり左` | `owknotS R A41` | Eyebrow | Vertex | — |
| 32 | `にこり右` | `owknotS R A42` | Eyebrow | Vertex | — |
| 33 | `怒り左` | `kirtF R B02` | Eyebrow | Vertex | — |
| 34 | `怒り右` | `kirtF R B03` | Eyebrow | Vertex | — |
| 35 | `恥ずかしい左` | `owknotF R A61` | Eyebrow | Vertex | — |
| 36 | `恥ずかしい右` | `owknotF R A64` | Eyebrow | Vertex | — |
| 37 | `上左` | `owknotF R A65` | Eyebrow | Vertex | — |
| 38 | `上右` | `owknotF R A62` | Eyebrow | Vertex | — |
| 39 | `下左` | `owknotF R A63` | Eyebrow | Vertex | — |
| 40 | `下右` | `kirtF CF B02` | Eyebrow | Vertex | — |
| 41 | `前左` | `kirtF CF B03` | Eyebrow | Vertex | — |
| 42 | `前右` | `p001 L Calf` | Eyebrow | Vertex | — |
| 43 | `まばたき` | `p001 R Calf` | Eye | Vertex | blink |
| 44 | `笑い` | `p001 L Toe0` | Eye | Vertex | smileEyes |
| 45 | `ウィンク` | `p001 L Toe0` | Eye | Vertex | — |
| 46 | `ウィンク右` | `p001 L Toe0Nub` | Eye | Vertex | — |
| 47 | `ウィンク２` | `p001 R Calf` | Eye | Vertex | — |
| 48 | `ウィンク２右` | `p001 R Foot` | Eye | Vertex | — |
| 49 | `なごみ` | `p001 R Toe0` | Eye | Vertex | — |
| 50 | `なごみ左` | `p001 R Toe0` | Eye | Vertex | — |
| 51 | `なごみ右` | `p001 R Toe0Nub` | Eye | Vertex | — |
| 52 | `びっくり` | `ow_Default` | Eye | Vertex | surprised |
| 53 | `じと目` | `ow_Trouble_L` | Eye | Vertex | — |
| 54 | `悲しむ` | `ow_Trouble_R` | Eye | Vertex | — |
| 55 | `怒り目` | `ow_Smily_L` | Eye | Vertex | — |
| 56 | `ジト目` | `ow_Smily_R` | Eye | Vertex | — |
| 57 | `眼角上` | `ow_Angry_L` | Eye | Vertex | — |
| 58 | `眼角下` | `ow_Angry_R` | Eye | Vertex | — |
| 59 | `下眼上` | `ow_Shy_L` | Eye | Vertex | — |
| 60 | `瞳小` | — | Eye | Vertex | — |
| 61 | `星目` | — | Other | Vertex | — |
| 62 | `ハイライト消` | — | Other | Vertex | — |

<a id="model-20"></a>
### 20. Ganyu

- Format: PMX
- Asset path: `gi/chars/Ganyu/Ganyu/甘雨.pmx`
- Embedded name: `Ganyu`
- Embedded English name: —
- Cache file: `0834f293b78cac389d1162788e462523c226099099feb5450162f82e3b85710a.asset`
- Morph counts: Eye: 18, Eyebrow: 21, Lip: 20, Other: 1; total: 60.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `まばたき` | `A01+VisionPelvisS R ` | Eye | Vertex | blink |
| 1 | `笑い` | — | Eye | Vertex | smileEyes |
| 2 | `ウィンク` | — | Eye | Vertex | — |
| 3 | `ウィンク右` | — | Eye | Vertex | — |
| 4 | `ウィンク２` | `A01+VisionPelvisS R ` | Eye | Vertex | — |
| 5 | `ウィンク２右` | `A02+VisionPelvisS R ` | Eye | Vertex | — |
| 6 | `なごみ` | `A03+VisionPelvisS R ` | Eye | Vertex | — |
| 7 | `なごみ左` | `A03+VisionPelvisS R ` | Eye | Vertex | — |
| 8 | `なごみ右` | `A04+VisionPelvisS L ` | Eye | Vertex | — |
| 9 | `びっくり` | `A01+VisionPelvisS L ` | Eye | Vertex | surprised |
| 10 | `じと目` | `A02+VisionPelvisS L ` | Eye | Vertex | — |
| 11 | `喜び` | `A03+VisionPelvisS L ` | Eye | Vertex | — |
| 12 | `怒り目` | `A04Bip001 L Calf` | Eye | Vertex | — |
| 13 | `ジト目` | — | Eye | Vertex | — |
| 14 | `眼角上` | — | Eye | Vertex | — |
| 15 | `眼角下` | — | Eye | Vertex | — |
| 16 | `下眼上` | — | Eye | Vertex | — |
| 17 | `あ` | — | Lip | Vertex | a |
| 18 | `い` | — | Lip | Vertex | i |
| 19 | `う` | — | Lip | Vertex | u |
| 20 | `え` | — | Lip | Vertex | e |
| 21 | `お` | — | Lip | Vertex | o |
| 22 | `にやり` | — | Lip | Vertex | smile |
| 23 | `ワ` | — | Lip | Vertex | — |
| 24 | `ん` | — | Lip | Vertex | — |
| 25 | `い１` | — | Lip | Vertex | — |
| 26 | `い２` | — | Lip | Vertex | — |
| 27 | `あ２` | — | Lip | Vertex | — |
| 28 | `にやり２` | — | Lip | Vertex | — |
| 29 | `にやり３` | — | Lip | Vertex | — |
| 30 | `ω` | — | Lip | Vertex | — |
| 31 | `てへぺろ` | — | Lip | Vertex | — |
| 32 | `ぺろっ` | — | Lip | Vertex | — |
| 33 | `口角上げ` | — | Lip | Vertex | — |
| 34 | `口横広げ` | — | Lip | Vertex | — |
| 35 | `口横狭め` | — | Lip | Vertex | — |
| 36 | `舌広げ` | — | Lip | Vertex | — |
| 37 | `困る左` | — | Eyebrow | Vertex | — |
| 38 | `困る右` | — | Eyebrow | Vertex | — |
| 39 | `にこり左` | — | Eyebrow | Vertex | — |
| 40 | `にこり右` | — | Eyebrow | Vertex | — |
| 41 | `怒り左` | — | Eyebrow | Vertex | — |
| 42 | `怒り右` | — | Eyebrow | Vertex | — |
| 43 | `真面目左` | — | Eyebrow | Vertex | — |
| 44 | `真面目右` | — | Eyebrow | Vertex | — |
| 45 | `上左` | — | Eyebrow | Vertex | — |
| 46 | `上右` | — | Eyebrow | Vertex | — |
| 47 | `下左` | — | Eyebrow | Vertex | — |
| 48 | `下右` | — | Eyebrow | Vertex | — |
| 49 | `前左` | — | Eyebrow | Vertex | — |
| 50 | `前右` | — | Eyebrow | Vertex | — |
| 51 | `困る` | — | Eyebrow | Vertex | sad |
| 52 | `にこり` | — | Eyebrow | Vertex | — |
| 53 | `怒り` | — | Eyebrow | Vertex | angry |
| 54 | `真面目` | — | Eyebrow | Vertex | — |
| 55 | `上` | — | Eyebrow | Vertex | — |
| 56 | `下` | — | Eyebrow | Vertex | — |
| 57 | `前` | — | Eyebrow | Vertex | — |
| 58 | `星目` | — | Eye | Vertex | — |
| 59 | `照れ` | — | Other | Vertex | — |

<a id="model-21"></a>
### 21. Hanya

- Format: PMX
- Asset path: `hsr/chars/Hanya/║«╤╗3.0.pmx`
- Embedded name: `寒鸦`
- Embedded English name: `寒鸦`
- Cache file: `9d77df2249b442267aff525b73a9358b5049d2f62226bc6e7389f56954b709bd.asset`
- Morph counts: Eye: 22, Eyebrow: 6, Lip: 36, Other: 1; total: 65.
- Unmatched app channels: `smile`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `真面目` | — | Eyebrow | Vertex | — |
| 1 | `困る` | — | Eyebrow | Vertex | sad |
| 2 | `にこり` | — | Eyebrow | Vertex | — |
| 3 | `怒り` | — | Eyebrow | Vertex | angry |
| 4 | `上` | — | Eyebrow | Vertex | — |
| 5 | `下` | — | Eyebrow | Vertex | — |
| 6 | `まばたき` | `Eye_Close01` | Eye | Vertex | blink |
| 7 | `笑い` | `Eye_Close02` | Eye | Vertex | smileEyes |
| 8 | `笑い1` | `Eye_Close03` | Eye | Vertex | — |
| 9 | `ウィンク` | — | Eye | Vertex | — |
| 10 | `ウィンク右` | — | Eye | Vertex | — |
| 11 | `ウィンク２` | — | Eye | Vertex | — |
| 12 | `ｳｨﾝｸ２右` | — | Eye | Vertex | — |
| 13 | `なごみ` | — | Eye | Vertex | — |
| 14 | `はぅ` | — | Eye | Vertex | — |
| 15 | `瞳小` | — | Eye | Vertex | — |
| 16 | `恐ろしい子！` | — | Eye | Vertex | — |
| 17 | `はちゅ目` | — | Eye | Vertex | — |
| 18 | `ｷﾘｯ` | `Eye_Angry01` | Eye | Vertex | — |
| 19 | `ｷﾘｯ1` | `Eye_Angry02` | Eye | Vertex | — |
| 20 | `ｷﾘｯ2` | `Eye_Doubt01` | Eye | Vertex | — |
| 21 | `ｷﾘｯ3` | `Eye_Doubt02` | Eye | Vertex | — |
| 22 | `びっくり` | `Eye_Surprise02` | Eye | Vertex | surprised |
| 23 | `びっくり1` | `Eye_Gentle01` | Eye | Vertex | — |
| 24 | `びっくり2` | `Eye_Gentle02` | Eye | Vertex | — |
| 25 | `びっくり3` | `Eye_Surprise01` | Eye | Vertex | — |
| 26 | `じと目0` | `Eye_Sweat01` | Eye | Vertex | — |
| 27 | `じと目1` | `Eye_Sweat02` | Eye | Vertex | — |
| 28 | `あ` | `Mouth_A` | Lip | Vertex | a |
| 29 | `い` | `Mouth_I` | Lip | Vertex | i |
| 30 | `い1` | `Mouth_Delta02` | Lip | Vertex | — |
| 31 | `い2` | `Mouth_N` | Lip | Vertex | — |
| 32 | `う` | `Mouth_Minimum` | Lip | Vertex | u |
| 33 | `え` | `Mouth_E` | Lip | Vertex | e |
| 34 | `え1` | `Mouth_Delta03` | Lip | Vertex | — |
| 35 | `お` | `Mouth_O` | Lip | Vertex | o |
| 36 | `お1` | `Mouth_U` | Lip | Vertex | — |
| 37 | `あ２` | `Mouth_Max` | Lip | Vertex | — |
| 38 | `倒ω` | `Mouth_Angry01` | Lip | Vertex | — |
| 39 | `にやり２` | `Mouth_Proud01` | Lip | Vertex | — |
| 40 | `にやり２1` | `Mouth_Proud02` | Lip | Vertex | — |
| 41 | `ワ` | `Mouth_Smile04` | Lip | Vertex | — |
| 42 | `ワ1` | `Mouth_Smile03` | Lip | Vertex | — |
| 43 | `ワ2` | `Mouth_Smile02` | Lip | Vertex | — |
| 44 | `□` | `Mouth_Angry02` | Lip | Vertex | — |
| 45 | `□1` | `Mouth_Angry03` | Lip | Vertex | — |
| 46 | `□2` | `Mouth_Angry04` | Lip | Vertex | — |
| 47 | `□3` | `Mouth_Pain03` | Lip | Vertex | — |
| 48 | `□4` | `Mouth_Pain04` | Lip | Vertex | — |
| 49 | `□5` | `Mouth_Worry02` | Lip | Vertex | — |
| 50 | `□6` | `Mouth_Worry03` | Lip | Vertex | — |
| 51 | `□7` | `Mouth_Worry04` | Lip | Vertex | — |
| 52 | `口上` | `Mouth_Up` | Lip | Vertex | — |
| 53 | `口下` | `Mouth_Down` | Lip | Vertex | — |
| 54 | `口横缩げ` | `Mouth_Narrow` | Lip | Vertex | — |
| 55 | `口横缩げ1` | `Mouth_Pout` | Lip | Vertex | — |
| 56 | `口横広げ` | `Mouth_Wide` | Lip | Vertex | — |
| 57 | `口角上げ` | `Mouth_Smile01` | Lip | Vertex | — |
| 58 | `口角下げ` | `Mouth_Delta01` | Lip | Vertex | — |
| 59 | `口角下げ1` | `Mouth_Pain01` | Lip | Vertex | — |
| 60 | `口角下げ2` | `Mouth_Pain02` | Lip | Vertex | — |
| 61 | `口角下げ3` | `Mouth_Twisted01` | Lip | Vertex | — |
| 62 | `口角下げ4` | `Mouth_Twisted02` | Lip | Vertex | — |
| 63 | `口角下げ5` | `Mouth_Worry01` | Lip | Vertex | — |
| 64 | `照れ` | — | Other | Vertex | — |

<a id="model-22"></a>
### 22. Jean

- Format: PMX
- Asset path: `gi/chars/Jean/Skin/琴.pmx`
- Embedded name: `Jean`
- Embedded English name: —
- Cache file: `43c0db83acaa3e1c12e8249a4a699086ee9511a055df051c782af04399871088.asset`
- Morph counts: Eye: 18, Eyebrow: 21, Lip: 21; total: 60.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `お` | — | Lip | Vertex | o |
| 1 | `あ` | — | Lip | Vertex | a |
| 2 | `い` | — | Lip | Vertex | i |
| 3 | `う` | — | Lip | Vertex | u |
| 4 | `え` | — | Lip | Vertex | e |
| 5 | `にやり` | — | Lip | Vertex | smile |
| 6 | `ワ` | — | Lip | Vertex | — |
| 7 | `ん` | — | Lip | Vertex | — |
| 8 | `い１` | `B L A01+HemB L B03` | Lip | Vertex | — |
| 9 | `い２` | — | Lip | Vertex | — |
| 10 | `あ２` | — | Lip | Vertex | — |
| 11 | `にやり２` | — | Lip | Vertex | — |
| 12 | `にやり３` | — | Lip | Vertex | — |
| 13 | `ω` | — | Lip | Vertex | — |
| 14 | `てへぺろ` | `Nub` | Lip | Vertex | — |
| 15 | `ぺろっ` | — | Lip | Vertex | — |
| 16 | `口角上げ` | `B R A01+HemB R B03` | Lip | Vertex | — |
| 17 | `口角下げ` | `B R A01+HemB R B03` | Lip | Vertex | — |
| 18 | `口横広げ` | — | Lip | Vertex | — |
| 19 | `口横狭め` | — | Lip | Vertex | — |
| 20 | `舌広げ` | `Nub` | Lip | Vertex | — |
| 21 | `まばたき` | — | Eye | Vertex | blink |
| 22 | `笑い` | — | Eye | Vertex | smileEyes |
| 23 | `なごみ` | — | Eye | Vertex | — |
| 24 | `ウィンク` | — | Eye | Vertex | — |
| 25 | `ウィンク右` | — | Eye | Vertex | — |
| 26 | `ウィンク２` | — | Eye | Vertex | — |
| 27 | `ウィンク２右` | — | Eye | Vertex | — |
| 28 | `なごみ左` | — | Eye | Vertex | — |
| 29 | `なごみ右` | — | Eye | Vertex | — |
| 30 | `びっくり` | — | Eye | Vertex | surprised |
| 31 | `じと目` | — | Eye | Vertex | — |
| 32 | `喜び` | — | Eye | Vertex | — |
| 33 | `怒り目` | — | Eye | Vertex | — |
| 34 | `ジト目` | — | Eye | Vertex | — |
| 35 | `眼角上` | — | Eye | Vertex | — |
| 36 | `眼角下` | — | Eye | Vertex | — |
| 37 | `下眼上` | — | Eye | Vertex | — |
| 38 | `星目` | — | Eye | Vertex | — |
| 39 | `困る` | `ue01` | Eyebrow | Vertex | sad |
| 40 | `にこり` | — | Eyebrow | Vertex | — |
| 41 | `怒り` | — | Eyebrow | Vertex | angry |
| 42 | `真面目` | — | Eyebrow | Vertex | — |
| 43 | `上` | — | Eyebrow | Vertex | — |
| 44 | `下` | — | Eyebrow | Vertex | — |
| 45 | `前` | — | Eyebrow | Vertex | — |
| 46 | `困る左` | `ue01` | Eyebrow | Vertex | — |
| 47 | `困る右` | — | Eyebrow | Vertex | — |
| 48 | `にこり左` | — | Eyebrow | Vertex | — |
| 49 | `にこり右` | — | Eyebrow | Vertex | — |
| 50 | `怒り左` | — | Eyebrow | Vertex | — |
| 51 | `怒り右` | — | Eyebrow | Vertex | — |
| 52 | `真面目左` | — | Eyebrow | Vertex | — |
| 53 | `真面目右` | — | Eyebrow | Vertex | — |
| 54 | `上左` | — | Eyebrow | Vertex | — |
| 55 | `上右` | — | Eyebrow | Vertex | — |
| 56 | `下左` | — | Eyebrow | Vertex | — |
| 57 | `下右` | — | Eyebrow | Vertex | — |
| 58 | `前左` | — | Eyebrow | Vertex | — |
| 59 | `前右` | — | Eyebrow | Vertex | — |

<a id="model-23"></a>
### 23. Jean

- Format: PMX
- Asset path: `gi/chars/Jean/Skin1/琴闲替衣装.pmx`
- Embedded name: `琴`
- Embedded English name: `ﾀﾗｵ鄂ｫｾ・`
- Cache file: `b108be4e547946f876305a049cf9dab7239379050ec888b06be314f16022b70d.asset`
- Morph counts: Eye: 18, Eyebrow: 8, Lip: 19, Other: 1; total: 46.
- Unmatched app channels: `smile`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `Mouth_Default` | `ger21` | Lip | Vertex | — |
| 1 | `あ` | `ger32` | Lip | Vertex | a |
| 2 | `い` | `ger22_e` | Lip | Vertex | i |
| 3 | `う` | — | Lip | Vertex | u |
| 4 | `え` | `ger22` | Lip | Vertex | e |
| 5 | `お` | — | Lip | Vertex | o |
| 6 | `口角上げ` | `ger31` | Lip | Vertex | — |
| 7 | `口角下げ` | `ger32_e` | Lip | Vertex | — |
| 8 | `い2` | `ger41` | Lip | Vertex | — |
| 9 | `□` | `ger42` | Lip | Vertex | — |
| 10 | `あ２` | `ger42_e` | Lip | Vertex | — |
| 11 | `にやり２` | — | Lip | Vertex | — |
| 12 | `Mouth_Doya02` | `_L` | Lip | Vertex | — |
| 13 | `ω` | `_R` | Lip | Vertex | — |
| 14 | `てへぺろ` | — | Lip | Vertex | — |
| 15 | `ぺろっ` | — | Lip | Vertex | — |
| 16 | `口横広げ` | — | Lip | Vertex | — |
| 17 | `Mouth_Line02` | — | Lip | Vertex | — |
| 18 | `Mouth_BigTongue01` | — | Lip | Vertex | — |
| 19 | `まばたき` | — | Eye | Vertex | blink |
| 20 | `笑い` | — | Eye | Vertex | smileEyes |
| 21 | `Eye_Default` | `Eye_Default` | Eye | Vertex | — |
| 22 | `ウィンク` | — | Eye | Vertex | — |
| 23 | `ウィンク右` | — | Eye | Vertex | — |
| 24 | `ウィンク２` | — | Eye | Vertex | — |
| 25 | `ウィンク２右` | — | Eye | Vertex | — |
| 26 | `なごみ左` | `_L` | Eye | Vertex | — |
| 27 | `なごみ右` | `_R` | Eye | Vertex | — |
| 28 | `びっくり` | `t` | Eye | Vertex | surprised |
| 29 | `じと目` | — | Eye | Vertex | — |
| 30 | `瞳縦潰れ` | — | Eye | Vertex | — |
| 31 | `瞳縦潰れ2` | `1` | Eye | Vertex | — |
| 32 | `じと目2` | `2` | Eye | Vertex | — |
| 33 | `キリッ上` | `1` | Eye | Vertex | — |
| 34 | `キリッ下` | `2` | Eye | Vertex | — |
| 35 | `星目` | — | Eye | Material | — |
| 36 | `Eye_Lowereyelid` | `3` | Eye | Vertex | — |
| 37 | `Brow_Default` | `Brow_Default` | Eyebrow | Vertex | — |
| 38 | `困る` | `st R A0` | Eyebrow | Vertex | sad |
| 39 | `にこり` | `d` | Eyebrow | Vertex | — |
| 40 | `怒り` | `ger1` | Eyebrow | Vertex | angry |
| 41 | `困る2` | `ger3` | Eyebrow | Vertex | — |
| 42 | `上` | `ger01` | Eyebrow | Vertex | — |
| 43 | `下` | `ger02_e` | Eyebrow | Vertex | — |
| 44 | `真面目` | `ger12` | Eyebrow | Vertex | — |
| 45 | `发Shadow(Ray)` | — | Other | Material | — |

<a id="model-24"></a>
### 24. Lucia

- Format: PMX
- Asset path: `zzz/chars/Lucia/Lucia.pmx`
- Embedded name: `Lucia2`
- Embedded English name: `Lucia2`
- Cache file: `9f5f531d7ef22cad913cad7c8f4d10061a042e9d2668144dc8603b339471271f.asset`
- Morph counts: Eye: 14, Eyebrow: 15, Lip: 19, Other: 2; total: 50.
- Unmatched app channels: `a`, `o`, `smile`, `sad`, `angry`, `surprised`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `まばたき` | `Fac_Eye_Close` | Eye | Vertex | blink |
| 1 | `笑い` | `Fac_Eye_Smile` | Eye | Vertex | smileEyes |
| 2 | `ウィンク` | `Fac_Eye_L_Wink` | Eye | Vertex | — |
| 3 | `ウィンク右` | `Fac_Eye_R_Wink` | Eye | Vertex | — |
| 4 | `ウィンク２` | `Fac_Eye_L_Close` | Eye | Vertex | — |
| 5 | `ウィンク２右` | `Fac_Eye_R_Close` | Eye | Vertex | — |
| 6 | `びっくり左` | `Fac_Eye_L_Open` | Eye | Vertex | — |
| 7 | `びっくり右` | `Fac_Eye_R_Open` | Eye | Vertex | — |
| 8 | `じと目` | `Fac_Eye_HalfClose` | Eye | Vertex | — |
| 9 | `怒り目２` | `Fac_Eye_MidDown` | Eye | Vertex | — |
| 10 | `怒り目` | `Fac_Eye_Angry` | Eye | Vertex | — |
| 11 | `悲しむ` | `Fac_Eye_Sad` | Eye | Vertex | — |
| 12 | `眼角下` | `Fac_Eye_MidUp` | Eye | Vertex | — |
| 13 | `下眼上` | `Fac_Eye_LowlidUp` | Eye | Vertex | — |
| 14 | `い` | `Fac_Mth_Ii` | Lip | Vertex | i |
| 15 | `う` | `Fac_Mth_Uu` | Lip | Vertex | u |
| 16 | `え` | `Fac_Mth_Ee` | Lip | Vertex | e |
| 17 | `ワ` | `Fac_Mth_AaTalk` | Lip | Vertex | — |
| 18 | `あ１` | `Fac_Mth_Aa1` | Lip | Vertex | — |
| 19 | `う２` | `Fac_Mth_UuOo` | Lip | Vertex | — |
| 20 | `笑う２` | `Fac_Mth_Laugh2` | Lip | Vertex | — |
| 21 | `口角上げ左` | `Fac_Mth_L_Up` | Lip | Vertex | — |
| 22 | `口角上げ右` | `Fac_Mth_R_Up` | Lip | Vertex | — |
| 23 | `口角下げ左` | `Fac_Mth_L_Down` | Lip | Vertex | — |
| 24 | `口角下げ右` | `Fac_Mth_R_Down` | Lip | Vertex | — |
| 25 | `口横狭め左` | `Fac_Mth_L_In` | Lip | Vertex | — |
| 26 | `口横狭め右` | `Fac_Mth_R_In` | Lip | Vertex | — |
| 27 | `口横広げ左` | `Fac_Mth_L_Out` | Lip | Vertex | — |
| 28 | `口横広げ右` | `Fac_Mth_R_Out` | Lip | Vertex | — |
| 29 | `口上` | `Fac_Mth_Up` | Lip | Vertex | — |
| 30 | `口下` | `Fac_Mth_Down` | Lip | Vertex | — |
| 31 | `口左` | `Fac_Mth_Left` | Lip | Vertex | — |
| 32 | `口右` | `Fac_Mth_Right` | Lip | Vertex | — |
| 33 | `八左` | `Fac_Ebr_L_Sad` | Eyebrow | Vertex | — |
| 34 | `八右` | `Fac_Ebr_R_Sad` | Eyebrow | Vertex | — |
| 35 | `怒り左` | `Fac_Ebr_L_Angry` | Eyebrow | Vertex | — |
| 36 | `怒り右` | `Fac_Ebr_R_Angry` | Eyebrow | Vertex | — |
| 37 | `にこり` | `Fac_Ebr_Smile` | Eyebrow | Vertex | — |
| 38 | `リラックス左` | `Fac_Ebr_L_Relax` | Eyebrow | Vertex | — |
| 39 | `リラックス右` | `Fac_Ebr_R_Relax` | Eyebrow | Vertex | — |
| 40 | `上` | `Fac_Ebr_Up` | Eyebrow | Vertex | — |
| 41 | `下` | `Fac_Ebr_Down` | Eyebrow | Vertex | — |
| 42 | `下左` | `Fac_Ebr_L_Down` | Eyebrow | Vertex | — |
| 43 | `下右` | `Fac_Ebr_R_Down` | Eyebrow | Vertex | — |
| 44 | `上左` | `Fac_Ebr_L_Up` | Eyebrow | Vertex | — |
| 45 | `上右` | `Fac_Ebr_R_Up` | Eyebrow | Vertex | — |
| 46 | `前左` | `Fac_Ebr_L_Front` | Eyebrow | Vertex | — |
| 47 | `前右` | `Fac_Ebr_R_Front` | Eyebrow | Vertex | — |
| 48 | `上歯` | `Fac_Tooth_Up` | Other | Vertex | — |
| 49 | `下歯` | `Fac_Tooth_Down` | Other | Vertex | — |

<a id="model-25"></a>
### 25. Lucy

- Format: PMX
- Asset path: `ww/chars/Lucy/Lucy.pmx`
- Embedded name: `Lucy`
- Embedded English name: `Lucy`
- Cache file: `f04f9cc365c60d550aa8d8b4b03951d63aa9f0b585b618162842b5cd42c66f29.asset`
- Morph counts: Eye: 9, Eyebrow: 6, Lip: 13, Other: 148; total: 176.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `L_P` | `L_P` | Other | Vertex | — |
| 1 | `L_F` | `L_F` | Other | Vertex | — |
| 2 | `L_B` | `L_B` | Other | Vertex | — |
| 3 | `L_F_U` | `L_F_U` | Other | Vertex | — |
| 4 | `L_B_U` | `L_B_U` | Other | Vertex | — |
| 5 | `L_Up` | `L_Up` | Other | Vertex | — |
| 6 | `L_Up_U` | `L_Up_U` | Other | Vertex | — |
| 7 | `R_P` | `R_P` | Other | Vertex | — |
| 8 | `R_F` | `R_F` | Other | Vertex | — |
| 9 | `R_B` | `R_B` | Other | Vertex | — |
| 10 | `R_F_U` | `R_F_U` | Other | Vertex | — |
| 11 | `R_B_U` | `R_B_U` | Other | Vertex | — |
| 12 | `R_Up` | `R_Up` | Other | Vertex | — |
| 13 | `R_Up_U` | `R_Up_U` | Other | Vertex | — |
| 14 | `Pupil_Up_R` | `Pupil_Up_R` | Other | Vertex | — |
| 15 | `Pupil_Up_L` | `Pupil_Up_L` | Other | Vertex | — |
| 16 | `Pupil_Down_R` | `Pupil_Down_R` | Other | Vertex | — |
| 17 | `Pupil_Down_L` | `Pupil_Down_L` | Other | Vertex | — |
| 18 | `Pupil_In_R` | `Pupil_In_R` | Other | Vertex | — |
| 19 | `Pupil_In_L` | `Pupil_In_L` | Other | Vertex | — |
| 20 | `Pupil_Out_R` | `Pupil_Out_R` | Other | Vertex | — |
| 21 | `Pupil_Out_L` | `Pupil_Out_L` | Other | Vertex | — |
| 22 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 23 | `E_Stare_R` | `E_Stare_R` | Other | Vertex | — |
| 24 | `E_Stare_L` | `E_Stare_L` | Other | Vertex | — |
| 25 | `Pupil_Up` | `Pupil_Up` | Other | Vertex | — |
| 26 | `Pupil_Down` | `Pupil_Down` | Other | Vertex | — |
| 27 | `Pupil_R` | `Pupil_R` | Other | Vertex | — |
| 28 | `Pupil_L` | `Pupil_L` | Other | Vertex | — |
| 29 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 30 | `S_02` | `S_02` | Other | Vertex | — |
| 31 | `S_04` | `S_04` | Other | Vertex | — |
| 32 | `B_Anger_R` | `B_Anger_R` | Other | Vertex | — |
| 33 | `B_Anger_L` | `B_Anger_L` | Other | Vertex | — |
| 34 | `B_Happy_R` | `B_Happy_R` | Other | Vertex | — |
| 35 | `B_Happy_L` | `B_Happy_L` | Other | Vertex | — |
| 36 | `B_Cheerful_R` | `B_Cheerful_R` | Other | Vertex | — |
| 37 | `B_Cheerful_L` | `B_Cheerful_L` | Other | Vertex | — |
| 38 | `B_Puzzled_R` | `B_Puzzled_R` | Other | Vertex | — |
| 39 | `B_Puzzled_L` | `B_Puzzled_L` | Other | Vertex | — |
| 40 | `B_Sad_R` | `B_Sad_R` | Other | Vertex | — |
| 41 | `B_Sad_L` | `B_Sad_L` | Other | Vertex | — |
| 42 | `B_Flat_R` | `B_Flat_R` | Other | Vertex | — |
| 43 | `B_Flat_L` | `B_Flat_L` | Other | Vertex | — |
| 44 | `B_Up_Add_R` | `B_Up_Add_R` | Other | Vertex | — |
| 45 | `B_Up_Add_L` | `B_Up_Add_L` | Other | Vertex | — |
| 46 | `B_Down_Add_R` | `B_Down_Add_R` | Other | Vertex | — |
| 47 | `B_Down_Add_L` | `B_Down_Add_L` | Other | Vertex | — |
| 48 | `ｳｨﾝｸ２右` | `E_Close_R` | Eye | Vertex | — |
| 49 | `ウィンク２` | `E_Close_L` | Eye | Vertex | — |
| 50 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 51 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 52 | `E_Squint_R` | `E_Squint_R` | Other | Vertex | — |
| 53 | `E_Squint_L` | `E_Squint_L` | Other | Vertex | — |
| 54 | `E_Anger_R` | `E_Anger_R` | Other | Vertex | — |
| 55 | `E_Anger_L` | `E_Anger_L` | Other | Vertex | — |
| 56 | `E_Sad_R` | `E_Sad_R` | Other | Vertex | — |
| 57 | `E_Sad_L` | `E_Sad_L` | Other | Vertex | — |
| 58 | `E_Focus` | `E_Focus` | Other | Vertex | — |
| 59 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 60 | `あ２` | `Aa` | Lip | Vertex | — |
| 61 | `あ` | `A` | Lip | Vertex | a |
| 62 | `い` | `E` | Lip | Vertex | i |
| 63 | `え` | `I` | Lip | Vertex | e |
| 64 | `お` | `O` | Lip | Vertex | o |
| 65 | `う` | `U` | Lip | Vertex | u |
| 66 | `UTooth` | `UTooth` | Other | Vertex | — |
| 67 | `M_Smile_R` | `M_Smile_R` | Other | Vertex | — |
| 68 | `M_Smile_L` | `M_Smile_L` | Other | Vertex | — |
| 69 | `M_Ennui_R` | `M_Ennui_R` | Other | Vertex | — |
| 70 | `M_Ennui_L` | `M_Ennui_L` | Other | Vertex | — |
| 71 | `M_Squint_R` | `M_Squint_R` | Other | Vertex | — |
| 72 | `M_Squint_L` | `M_Squint_L` | Other | Vertex | — |
| 73 | `M_OpenSmall` | `M_OpenSmall` | Other | Vertex | — |
| 74 | `M_Laugh` | `M_Laugh` | Other | Vertex | — |
| 75 | `M_Scared` | `M_Scared` | Other | Vertex | — |
| 76 | `M_ScaredTooth` | `M_ScaredTooth` | Other | Vertex | — |
| 77 | `M_Anger` | `M_Anger` | Other | Vertex | — |
| 78 | `M_Puff` | `M_Puff` | Other | Vertex | — |
| 79 | `M_Trapezoid` | `M_Trapezoid` | Other | Vertex | — |
| 80 | `M_O` | `M_O` | Other | Vertex | — |
| 81 | `M_A` | `M_A` | Other | Vertex | — |
| 82 | `∧` | `M_Nutcracker` | Lip | Vertex | — |
| 83 | `M_Scared_Up_R` | `M_Scared_Up_R` | Other | Vertex | — |
| 84 | `M_Scared_Up_L` | `M_Scared_Up_L` | Other | Vertex | — |
| 85 | `M_Scared_Down_R` | `M_Scared_Down_R` | Other | Vertex | — |
| 86 | `M_Scared_Down_L` | `M_Scared_Down_L` | Other | Vertex | — |
| 87 | `M_pout_Up` | `M_pout_Up` | Other | Vertex | — |
| 88 | `M_pout_Down` | `M_pout_Down` | Other | Vertex | — |
| 89 | `M_meow_R` | `M_meow_R` | Other | Vertex | — |
| 90 | `M_meow_L` | `M_meow_L` | Other | Vertex | — |
| 91 | `M_Close` | `M_Close` | Other | Vertex | — |
| 92 | `P_M_R_Add` | `P_M_R_Add` | Other | Vertex | — |
| 93 | `P_M_L_Add` | `P_M_L_Add` | Other | Vertex | — |
| 94 | `P_M_ZR_Add` | `P_M_ZR_Add` | Other | Vertex | — |
| 95 | `P_M_ZL_Add` | `P_M_ZL_Add` | Other | Vertex | — |
| 96 | `C_ZR_Face` | `C_ZR_Face` | Other | Vertex | — |
| 97 | `C_ZL_Face` | `C_ZL_Face` | Other | Vertex | — |
| 98 | `C_Down_Face` | `C_Down_Face` | Other | Vertex | — |
| 99 | `C_Up_Face` | `C_Up_Face` | Other | Vertex | — |
| 100 | `C_M_Distant` | `C_M_Distant` | Other | Vertex | — |
| 101 | `P_Nose_Up` | `P_Nose_Up` | Other | Vertex | — |
| 102 | `P_Nose_Down` | `P_Nose_Down` | Other | Vertex | — |
| 103 | `P_M_Up_Add` | `P_M_Up_Add` | Other | Vertex | — |
| 104 | `P_M_Down_Add` | `P_M_Down_Add` | Other | Vertex | — |
| 105 | `P_M_RMove_Add` | `P_M_RMove_Add` | Other | Vertex | — |
| 106 | `P_M_LMove_Add` | `P_M_LMove_Add` | Other | Vertex | — |
| 107 | `P_M_MidPoint_Up` | `P_M_MidPoint_Up` | Other | Vertex | — |
| 108 | `P_M_MidPoint_Down` | `P_M_MidPoint_Down` | Other | Vertex | — |
| 109 | `P_M_UpDownView_Add` | `P_M_UpDownView_Add` | Other | Vertex | — |
| 110 | `P_M_Scale_Add` | `P_M_Scale_Add` | Other | Vertex | — |
| 111 | `E_Blephar_R` | `E_Blephar_R` | Other | Vertex | — |
| 112 | `E_Blephar_L` | `E_Blephar_L` | Other | Vertex | — |
| 113 | `B_Inside_Add` | `B_Inside_Add` | Other | Vertex | — |
| 114 | `P_M_Forward` | `P_M_Forward` | Other | Vertex | — |
| 115 | `P_M_jawRight` | `P_M_jawRight` | Other | Vertex | — |
| 116 | `P_M_jawLeft` | `P_M_jawLeft` | Other | Vertex | — |
| 117 | `P_M_Stretch_R` | `P_M_Stretch_R` | Other | Vertex | — |
| 118 | `P_M_Stretch_L` | `P_M_Stretch_L` | Other | Vertex | — |
| 119 | `S_01` | `S_01` | Other | Vertex | — |
| 120 | `S_03` | `S_03` | Other | Vertex | — |
| 121 | `S_05` | `S_05` | Other | Vertex | — |
| 122 | `S_06` | `S_06` | Other | Vertex | — |
| 123 | `S_07` | `S_07` | Other | Vertex | — |
| 124 | `S_08` | `S_08` | Other | Vertex | — |
| 125 | `S_09` | `S_09` | Other | Vertex | — |
| 126 | `S_10` | `S_10` | Other | Vertex | — |
| 127 | `S_11` | `S_11` | Other | Vertex | — |
| 128 | `S_12` | `S_12` | Other | Vertex | — |
| 129 | `S_13` | `S_13` | Other | Vertex | — |
| 130 | `S_14` | `S_14` | Other | Vertex | — |
| 131 | `S_15` | `S_15` | Other | Vertex | — |
| 132 | `S_16` | `S_16` | Other | Vertex | — |
| 133 | `S_17` | `S_17` | Other | Vertex | — |
| 134 | `S_18` | `S_18` | Other | Vertex | — |
| 135 | `S_19` | `S_19` | Other | Vertex | — |
| 136 | `S_20` | `S_20` | Other | Vertex | — |
| 137 | `S_21` | `S_21` | Other | Vertex | — |
| 138 | `S_22` | `S_22` | Other | Vertex | — |
| 139 | `S_23` | `S_23` | Other | Vertex | — |
| 140 | `S_24` | `S_24` | Other | Vertex | — |
| 141 | `S_25` | `S_25` | Other | Vertex | — |
| 142 | `S_26` | `S_26` | Other | Vertex | — |
| 143 | `S_27` | `S_27` | Other | Vertex | — |
| 144 | `S_28` | `S_28` | Other | Vertex | — |
| 145 | `S_29` | `S_29` | Other | Vertex | — |
| 146 | `S_30` | `S_30` | Other | Vertex | — |
| 147 | `B_Anger` | `B_Anger` | Other | Vertex | — |
| 148 | `B_Happy` | `B_Happy` | Other | Vertex | — |
| 149 | `B_Cheerful` | `B_Cheerful` | Other | Vertex | — |
| 150 | `B_Sad` | `B_Sad` | Other | Vertex | — |
| 151 | `B_Flat` | `B_Flat` | Other | Vertex | — |
| 152 | `B_AH_R` | `B_AH_R` | Other | Vertex | — |
| 153 | `B_AH_L` | `B_AH_L` | Other | Vertex | — |
| 154 | `B_Up_Add` | `B_Up_Add` | Other | Vertex | — |
| 155 | `B_Down_Add` | `B_Down_Add` | Other | Vertex | — |
| 156 | `E_Close` | `E_Close` | Other | Vertex | — |
| 157 | `E_Anger` | `E_Anger` | Other | Vertex | — |
| 158 | `E_Sad` | `E_Sad` | Other | Vertex | — |
| 159 | `P_M_MidPoint_Add` | `P_M_MidPoint_Add` | Other | Vertex | — |
| 160 | `E_Blephar` | `E_Blephar` | Other | Vertex | — |
| 161 | `まばたき` | — | Eye | Group | blink |
| 162 | `笑い` | — | Eye | Group | smileEyes |
| 163 | `mmd_armature` | — | Other | Vertex | — |
| 164 | `怒り` | — | Eyebrow | Group | angry |
| 165 | `困る` | — | Eyebrow | Group | sad |
| 166 | `にこり` | — | Eyebrow | Group | — |
| 167 | `真面目` | — | Eyebrow | Group | — |
| 168 | `上` | — | Eyebrow | Group | — |
| 169 | `下` | — | Eyebrow | Group | — |
| 170 | `にやり` | — | Lip | Group | smile |
| 171 | `にやり２` | — | Lip | Group | — |
| 172 | `にっこり` | — | Lip | Group | — |
| 173 | `口角上げ` | — | Lip | Group | — |
| 174 | `口角下げ` | — | Lip | Group | — |
| 175 | `口横広げ` | — | Lip | Group | — |

<a id="model-26"></a>
### 26. Lupa

- Format: BPMX
- Asset path: `ww/chars/Lupa/Lupa.bpmx`
- Embedded name: `露帕`
- Embedded English name: `露帕`
- Cache file: `29cc2656e6c047886f9cc36b0412359b30ddf14d305536c49ec319e34918585b.asset`
- Morph counts: Eye: 38, Eyebrow: 27, Lip: 37, Other: 45; total: 147.
- Unmatched app channels: `smile`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `困る` | `B_Sad` | Eyebrow | Vertex | sad |
| 1 | `困るL` | `B_Sad` | Eyebrow | Vertex | — |
| 2 | `困るR` | `B_Sad` | Eyebrow | Vertex | — |
| 3 | `にこり` | `B_Happy` | Eyebrow | Vertex | — |
| 4 | `にこりL` | `B_Happy` | Eyebrow | Vertex | — |
| 5 | `にこりR` | `B_Happy` | Eyebrow | Vertex | — |
| 6 | `にこり２` | `B_Cheerful` | Eyebrow | Vertex | — |
| 7 | `にこり２L` | `B_Cheerful` | Eyebrow | Vertex | — |
| 8 | `にこり２R` | `B_Cheerful` | Eyebrow | Vertex | — |
| 9 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 10 | `怒りL` | `B_Anger` | Eyebrow | Vertex | — |
| 11 | `怒りR` | `B_Anger` | Eyebrow | Vertex | — |
| 12 | `怒り２` | `B_AH_L` | Eyebrow | Vertex | — |
| 13 | `怒り２L` | `B_AH_L` | Eyebrow | Vertex | — |
| 14 | `怒り２R` | `B_AH_R` | Eyebrow | Vertex | — |
| 15 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 16 | `上L` | `B_Up_Add` | Eyebrow | Vertex | — |
| 17 | `上R` | `B_Up_Add` | Eyebrow | Vertex | — |
| 18 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 19 | `下L` | `B_Down_Add` | Eyebrow | Vertex | — |
| 20 | `下R` | `B_Down_Add` | Eyebrow | Vertex | — |
| 21 | `平行` | `B_Flat` | Eyebrow | Vertex | — |
| 22 | `平行L` | `B_Flat` | Eyebrow | Vertex | — |
| 23 | `平行R` | `B_Flat` | Eyebrow | Vertex | — |
| 24 | `入` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 25 | `入L` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 26 | `入R` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 27 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 28 | `ウィンク２` | `E_Close` | Eye | Vertex | — |
| 29 | `ウィンク２R` | `E_Close` | Eye | Vertex | — |
| 30 | `笑い` | `E_Smile_L` | Eye | Vertex | smileEyes |
| 31 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 32 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 33 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 34 | `じと目L` | `E_Insipid` | Eye | Vertex | — |
| 35 | `じと目R` | `E_Insipid` | Eye | Vertex | — |
| 36 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 37 | `びっくりL` | `E_Stare` | Eye | Vertex | — |
| 38 | `びっくりR` | `E_Stare` | Eye | Vertex | — |
| 39 | `キリッ` | `E_Anger` | Eye | Vertex | — |
| 40 | `キリッL` | `E_Anger` | Eye | Vertex | — |
| 41 | `キリッR` | `E_Anger` | Eye | Vertex | — |
| 42 | `たれ目` | `E_Focus` | Eye | Vertex | — |
| 43 | `たれ目L` | `E_Focus` | Eye | Vertex | — |
| 44 | `たれ目R` | `E_Focus` | Eye | Vertex | — |
| 45 | `笑い目` | `E_Blephar` | Eye | Vertex | — |
| 46 | `笑い目L` | `E_Blephar` | Eye | Vertex | — |
| 47 | `笑い目R` | `E_Blephar` | Eye | Vertex | — |
| 48 | `悲しい目` | `E_Sad` | Eye | Vertex | — |
| 49 | `悲しい目L` | `E_Sad` | Eye | Vertex | — |
| 50 | `悲しい目R` | `E_Sad` | Eye | Vertex | — |
| 51 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 52 | `瞳小L` | `Pupil_Scale` | Eye | Vertex | — |
| 53 | `瞳小R` | `Pupil_Scale` | Eye | Vertex | — |
| 54 | `恐ろしい子！` | `恐ろしい子！` | Eye | Vertex | — |
| 55 | `恐ろしい子！L` | `恐ろしい子！` | Eye | Vertex | — |
| 56 | `恐ろしい子！R` | `恐ろしい子！` | Eye | Vertex | — |
| 57 | `ハイライト消` | `ハイライト消` | Eye | Vertex | — |
| 58 | `ハイライト消L` | `ハイライト消` | Eye | Vertex | — |
| 59 | `ハイライト消R` | `ハイライト消` | Eye | Vertex | — |
| 60 | `カメラ目` | `カメラ目` | Eye | Vertex | — |
| 61 | `Up` | `Pupil_Up` | Eye | Vertex | — |
| 62 | `Down` | `Pupil_Down` | Eye | Vertex | — |
| 63 | `Right` | `Pupil_R` | Eye | Vertex | — |
| 64 | `Left` | `Pupil_L` | Eye | Vertex | — |
| 65 | `あ` | `A` | Lip | Vertex | a |
| 66 | `あ２` | `Aa` | Lip | Vertex | — |
| 67 | `ああ` | `M_Trapezoid` | Lip | Vertex | — |
| 68 | `い` | `I` | Lip | Vertex | i |
| 69 | `い２` | `M_ScaredTooth` | Lip | Vertex | — |
| 70 | `う` | `U` | Lip | Vertex | u |
| 71 | `う２` | `M_OpenSmall` | Lip | Vertex | — |
| 72 | `え` | `E` | Lip | Vertex | e |
| 73 | `お` | `O` | Lip | Vertex | o |
| 74 | `お２` | `M_O` | Lip | Vertex | — |
| 75 | `ワ` | `M_Laugh` | Lip | Vertex | — |
| 76 | `ん` | `M_Anger` | Lip | Vertex | — |
| 77 | `ん２` | `C_M_Distant` | Lip | Vertex | — |
| 78 | `∧` | `M_Nutcracker` | Lip | Vertex | — |
| 79 | `□` | `M_A` | Lip | Vertex | — |
| 80 | `なんで` | `M_Scared` | Lip | Vertex | — |
| 81 | `口角下げ左` | `M_Ennui_L` | Lip | Vertex | — |
| 82 | `口角下げ右` | `M_Ennui_R` | Lip | Vertex | — |
| 83 | `口角上げ左` | `M_Smile_L` | Lip | Vertex | — |
| 84 | `口角上げ右` | `M_Smile_R` | Lip | Vertex | — |
| 85 | `口横広げ左` | `P_M_L_Add` | Lip | Vertex | — |
| 86 | `口横広げ右` | `P_M_R_Add` | Lip | Vertex | — |
| 87 | `口横広げ2右` | `P_M_ZR_Add` | Lip | Vertex | — |
| 88 | `口横広げ2左` | `P_M_ZL_Add` | Lip | Vertex | — |
| 89 | `口横縮小` | `P_M_Scale_Add` | Lip | Vertex | — |
| 90 | `齶右` | `C_ZR_Face` | Lip | Vertex | — |
| 91 | `齶左` | `C_ZL_Face` | Lip | Vertex | — |
| 92 | `齶前` | `C_Down_Face` | Lip | Vertex | — |
| 93 | `齶上` | `C_Up_Face` | Lip | Vertex | — |
| 94 | `鼻上` | `P_Nose_Up` | Lip | Vertex | — |
| 95 | `鼻下` | `P_Nose_Down` | Lip | Vertex | — |
| 96 | `口上` | `P_M_Up_Add` | Lip | Vertex | — |
| 97 | `口下` | `P_M_Down_Add` | Lip | Vertex | — |
| 98 | `口右` | `P_M_RMove_Add` | Lip | Vertex | — |
| 99 | `口左` | `P_M_LMove_Add` | Lip | Vertex | — |
| 100 | `唇中` | `P_M_MidPoint_Add` | Lip | Vertex | — |
| 101 | `口角前` | `P_M_UpDownView_Add` | Lip | Vertex | — |
| 102 | `S_01` | `S_01` | Other | Vertex | — |
| 103 | `S_02` | `S_02` | Other | Vertex | — |
| 104 | `S_03` | `S_03` | Other | Vertex | — |
| 105 | `S_04` | `S_04` | Other | Vertex | — |
| 106 | `S_08` | `S_08` | Other | Vertex | — |
| 107 | `S_10` | `S_10` | Other | Vertex | — |
| 108 | `S_12` | `S_12` | Other | Vertex | — |
| 109 | `S_13` | `S_13` | Other | Vertex | — |
| 110 | `S_14` | `S_14` | Other | Vertex | — |
| 111 | `S_15` | `S_15` | Other | Vertex | — |
| 112 | `S_16` | `S_16` | Other | Vertex | — |
| 113 | `S_17` | `S_17` | Other | Vertex | — |
| 114 | `S_18` | `S_18` | Other | Vertex | — |
| 115 | `S_19` | `S_19` | Other | Vertex | — |
| 116 | `S_20` | `S_20` | Other | Vertex | — |
| 117 | `S_21` | `S_21` | Other | Vertex | — |
| 118 | `S_22` | `S_22` | Other | Vertex | — |
| 119 | `S_23` | `S_23` | Other | Vertex | — |
| 120 | `S_24` | `S_24` | Other | Vertex | — |
| 121 | `S_29` | `S_29` | Other | Vertex | — |
| 122 | `S_30` | `S_30` | Other | Vertex | — |
| 123 | `FaceRed` | `FaceRed` | Other | Vertex | — |
| 124 | `#` | `#` | Other | Vertex | — |
| 125 | `#2` | `#2` | Other | Vertex | — |
| 126 | `？` | `？` | Other | Vertex | — |
| 127 | `！` | `！` | Other | Vertex | — |
| 128 | `ZZZ` | `ZZZ` | Other | Vertex | — |
| 129 | `汗` | `汗` | Other | Vertex | — |
| 130 | `はちゅ` | `はちゅ` | Other | Vertex | — |
| 131 | `惊` | `惊` | Other | Vertex | — |
| 132 | `……` | `……` | Other | Vertex | — |
| 133 | `星目` | `星目` | Other | Vertex | — |
| 134 | `星目2` | `星目2` | Other | Vertex | — |
| 135 | `はぁと` | `はぁと` | Other | Vertex | — |
| 136 | `はぁと2` | `はぁと2` | Other | Vertex | — |
| 137 | `照れ` | `照れ` | Other | Vertex | — |
| 138 | `照れ2` | `照れ2` | Other | Vertex | — |
| 139 | `涙` | `涙` | Other | Vertex | — |
| 140 | `黒化` | `黒化` | Other | Material | — |
| 141 | `白化` | `白化` | Other | Material | — |
| 142 | `透過` | `透過` | Other | Material | — |
| 143 | `轮廓线OFF` | — | Other | Material | — |
| 144 | `spa深` | — | Other | Material | — |
| 145 | `髪高光消` | — | Other | Material | — |
| 146 | `CloakOFF` | `透過` | Other | Material | — |

<a id="model-27"></a>
### 27. Neverness to Everness-Mint Swimsuit

- Format: PMX
- Asset path: `nte/chars/Mint/Mint_swimsuit/Mint.pmx`
- Embedded name: `异环-薄荷Swimsuit`
- Embedded English name: `Neverness to Everness-Mint Swimsuit`
- Cache file: `4051d1da66658bd007429299944af782b1e879cd34438b8df81910c5f2c28582.asset`
- Morph counts: Eye: 12, Eyebrow: 7, Lip: 15, Other: 134; total: 168.
- Unmatched app channels: `e`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `-----目-----` | — | Eye | Material | — |
| 1 | `まばたき` | `close` | Eye | Vertex | blink |
| 2 | `笑い` | `smile` | Eye | Vertex | smileEyes |
| 3 | `ウィンク` | `wink` | Eye | Vertex | — |
| 4 | `ウィンク右` | `wink R` | Eye | Vertex | — |
| 5 | `ウィンク２右` | — | Eye | Vertex | — |
| 6 | `ウィンク2` | — | Eye | Vertex | — |
| 7 | `なごみ` | `= =` | Eye | Vertex | — |
| 8 | `はぅ` | `&gt;&lt;` | Eye | Vertex | — |
| 9 | `びっくり` | `surprise` | Eye | Vertex | surprised |
| 10 | `じと目` | `doubt` | Eye | Vertex | — |
| 11 | `なぬ！` | `confuse` | Eye | Vertex | — |
| 12 | `-----口-----` | — | Lip | Material | — |
| 13 | `あ` | `a` | Lip | Vertex | a |
| 14 | `あ2` | — | Lip | Vertex | — |
| 15 | `い` | `i` | Lip | Vertex | i |
| 16 | `う` | `u` | Lip | Vertex | u |
| 17 | `お` | `o` | Lip | Vertex | o |
| 18 | `▲` | `▲` | Lip | Vertex | — |
| 19 | `∧` | `∧` | Lip | Vertex | — |
| 20 | `ω` | `omega` | Lip | Vertex | — |
| 21 | `ω□` | `omegawa` | Lip | Vertex | — |
| 22 | `にやり` | `grin` | Lip | Vertex | smile |
| 23 | `ぺろっ` | `tongue left` | Lip | Vertex | — |
| 24 | `はんっ！` | — | Lip | Vertex | — |
| 25 | `えー` | — | Lip | Vertex | — |
| 26 | `平` | — | Lip | Vertex | — |
| 27 | `-----眉-----` | — | Eyebrow | Material | — |
| 28 | `真面目` | `serious` | Eyebrow | Vertex | — |
| 29 | `困る` | `sadness ` | Eyebrow | Vertex | sad |
| 30 | `にこり` | `cheerful` | Eyebrow | Vertex | — |
| 31 | `怒り` | `anger` | Eyebrow | Vertex | angry |
| 32 | `上` | `go up` | Eyebrow | Vertex | — |
| 33 | `下` | — | Eyebrow | Vertex | — |
| 34 | `-----cloth-----` | — | Other | Material | — |
| 35 | `hat` | — | Other | Vertex | — |
| 36 | `hide shawl` | — | Other | Material | — |
| 37 | `-----emotion-----` | — | Other | Material | — |
| 38 | `TD_Scale` | — | Other | Vertex | — |
| 39 | `TD_Veins` | — | Other | Vertex | — |
| 40 | `TD_Exclamation` | — | Other | Vertex | — |
| 41 | `TD_Amazed` | — | Other | Vertex | — |
| 42 | `TD_Sweaty` | — | Other | Vertex | — |
| 43 | `TD_Hate` | — | Other | Vertex | — |
| 44 | `TD_BeanieEye` | — | Other | Vertex | — |
| 45 | `TD_SymbolEye` | — | Other | Vertex | — |
| 46 | `TD_EggEyes` | — | Other | Vertex | — |
| 47 | `TD_gandong` | — | Other | Vertex | — |
| 48 | `TD_Speechless` | — | Other | Vertex | — |
| 49 | `look_U` | — | Other | Vertex | — |
| 50 | `look_RU` | — | Other | Vertex | — |
| 51 | `look_R` | — | Other | Vertex | — |
| 52 | `look_RD` | — | Other | Vertex | — |
| 53 | `look_D` | — | Other | Vertex | — |
| 54 | `look_LD` | — | Other | Vertex | — |
| 55 | `look_L` | — | Other | Vertex | — |
| 56 | `look_LU` | — | Other | Vertex | — |
| 57 | `mouthUpperUp` | — | Other | Vertex | — |
| 58 | `jiongmei` | — | Other | Vertex | — |
| 59 | `gandong` | — | Other | Vertex | — |
| 60 | `gandong_zui` | — | Other | Vertex | — |
| 61 | `heixian` | — | Other | Vertex | — |
| 62 | `hua` | — | Other | Vertex | — |
| 63 | `doudouyanbiaoqing` | — | Other | Vertex | — |
| 64 | `shengluehao` | — | Other | Vertex | — |
| 65 | `liuhan` | — | Other | Vertex | — |
| 66 | `wenhao` | — | Other | Vertex | — |
| 67 | `gantanhao` | — | Other | Vertex | — |
| 68 | `shengqi` | — | Other | Vertex | — |
| 69 | `haixiu` | — | Other | Vertex | — |
| 70 | `quanquanyan` | — | Other | Vertex | — |
| 71 | `mantoudahan` | — | Other | Vertex | — |
| 72 | `yansu` | — | Other | Vertex | — |
| 73 | `beishang` | — | Other | Vertex | — |
| 74 | `YK_D_shangxia` | — | Other | Vertex | — |
| 75 | `YK_D_neiwai` | — | Other | Vertex | — |
| 76 | `YK_U_neiwai` | — | Other | Vertex | — |
| 77 | `YK_U_shangxia` | — | Other | Vertex | — |
| 78 | `gangajinzhang` | — | Other | Vertex | — |
| 79 | `gangadexiao` | — | Other | Vertex | — |
| 80 | `gangajinzhang_zui` | — | Other | Vertex | — |
| 81 | `tiaomei` | — | Other | Vertex | — |
| 82 | `taimei` | — | Other | Vertex | — |
| 83 | `tanqi1` | — | Other | Vertex | — |
| 84 | `tanqi` | — | Other | Vertex | — |
| 85 | `tanqi_zui` | — | Other | Vertex | — |
| 86 | `sisuo_zui` | — | Other | Vertex | — |
| 87 | `sisuo` | — | Other | Vertex | — |
| 88 | `jinghuang` | — | Other | Vertex | — |
| 89 | `jiangying` | — | Other | Vertex | — |
| 90 | `jinghuang_zui` | — | Other | Vertex | — |
| 91 | `jiangmei` | — | Other | Vertex | — |
| 92 | `jingxi` | — | Other | Vertex | — |
| 93 | `jingxi_zui` | — | Other | Vertex | — |
| 94 | `jingya` | — | Other | Vertex | — |
| 95 | `jishou` | — | Other | Vertex | — |
| 96 | `jishou_han` | — | Other | Vertex | — |
| 97 | `jishou_zui` | — | Other | Vertex | — |
| 98 | `baozilian001` | — | Other | Vertex | — |
| 99 | `baozilian002` | — | Other | Vertex | — |
| 100 | `baozilian` | — | Other | Vertex | — |
| 101 | `dandanyan1` | — | Other | Vertex | — |
| 102 | `daxiao` | — | Other | Vertex | — |
| 103 | `daxiao_zui` | — | Other | Vertex | — |
| 104 | `deyi` | — | Other | Vertex | — |
| 105 | `deyi_zui` | — | Other | Vertex | — |
| 106 | `louthLowerDown` | — | Other | Vertex | — |
| 107 | `LPSmouthE` | — | Other | Vertex | — |
| 108 | `LPSmouthSmile` | — | Other | Vertex | — |
| 109 | `weixiao` | — | Other | Vertex | — |
| 110 | `fennu` | — | Other | Vertex | — |
| 111 | `xingxingyan` | — | Other | Vertex | — |
| 112 | `xingxingyan_zui` | — | Other | Vertex | — |
| 113 | `xingxingyan1` | — | Other | Vertex | — |
| 114 | `TDS_Scale` | — | Other | Vertex | — |
| 115 | `TDS_Scale_02` | — | Other | Vertex | — |
| 116 | `TDS_Scale_03` | — | Other | Vertex | — |
| 117 | `TDS_Scale_04` | — | Other | Vertex | — |
| 118 | `TDS_Scale_05` | — | Other | Vertex | — |
| 119 | `TDS_Scale_06` | — | Other | Vertex | — |
| 120 | `TDS_Scale_07` | — | Other | Vertex | — |
| 121 | `TDS_yunxuan_01` | — | Other | Vertex | — |
| 122 | `TDS_xianquan_01` | — | Other | Vertex | — |
| 123 | `TDS_StarEyes` | — | Other | Vertex | — |
| 124 | `TDS_liuhan` | — | Other | Vertex | — |
| 125 | `TDS_heixian` | — | Other | Vertex | — |
| 126 | `TDS_Doubt` | — | Other | Vertex | — |
| 127 | `TDS_lianhong` | — | Other | Vertex | — |
| 128 | `TDS_haixiu` | — | Other | Vertex | — |
| 129 | `TDS_Flower` | — | Other | Vertex | — |
| 130 | `TDS_Thorny` | — | Other | Vertex | — |
| 131 | `TDS_Stiff` | — | Other | Vertex | — |
| 132 | `TDS_Angry_01` | — | Other | Vertex | — |
| 133 | `TDS_Angry_02` | — | Other | Vertex | — |
| 134 | `TDS_Angry_03` | — | Other | Vertex | — |
| 135 | `TDS_Angry_04` | — | Other | Vertex | — |
| 136 | `TDS_Angry_05` | — | Other | Vertex | — |
| 137 | `TDS_tanqi_01` | — | Other | Vertex | — |
| 138 | `TDS_tanqi_02` | — | Other | Vertex | — |
| 139 | `TDS_tanqi_03` | — | Other | Vertex | — |
| 140 | `TDS_tanqi_04` | — | Other | Vertex | — |
| 141 | `TDS_shengluehao_01` | — | Other | Vertex | — |
| 142 | `TDS_shengluehao_02` | — | Other | Vertex | — |
| 143 | `TDS_shengluehao_03` | — | Other | Vertex | — |
| 144 | `TDS_shengluehao_04` | — | Other | Vertex | — |
| 145 | `TDS_yankuanglei_01` | — | Other | Vertex | — |
| 146 | `TDS_gandonglei_01` | — | Other | Vertex | — |
| 147 | `TDS_liulei_01` | — | Other | Vertex | — |
| 148 | `TDS_liulei_02` | — | Other | Vertex | — |
| 149 | `TDS_liulei_03` | — | Other | Vertex | — |
| 150 | `TDS_liulei_04` | — | Other | Vertex | — |
| 151 | `TDS_leizhu_01` | — | Other | Vertex | — |
| 152 | `TDS_leizhu_02` | — | Other | Vertex | — |
| 153 | `TDS_leizhu_03` | — | Other | Vertex | — |
| 154 | `TDS_leizhu_04` | — | Other | Vertex | — |
| 155 | `TDS_leizhu_05` | — | Other | Vertex | — |
| 156 | `-----other-----` | — | Other | Material | — |
| 157 | `照れ消` | — | Other | Material | — |
| 158 | `HL消２` | `HL 2` | Other | Material | — |
| 159 | `Hairshadow消` | `No hair shadow` | Other | Material | — |
| 160 | `輪郭線が消えて` | `No outline` | Other | Material | — |
| 161 | `toon白くなる` | `White toon` | Other | Material | — |
| 162 | `toon深まる` | `deepen toon` | Other | Material | — |
| 163 | `spa消える` | `spa disappears` | Other | Material | — |
| 164 | `消えて` | `Disappear` | Other | Material | — |
| 165 | `全黒モード` | `All black` | Other | Material | — |
| 166 | `全灰モード` | `All grey` | Other | Material | — |
| 167 | `全白モード` | `All white` | Other | Material | — |

<a id="model-28"></a>
### 28. New MMD Model

- Format: PMX
- Asset path: —
- Embedded name: `鳴潮_琳奈`
- Embedded English name: `New MMD Model`
- Cache file: `7dc4e51f676b6073f3301a4f02084efb3c7c4facd3526c0ab2c739948abbf27e.asset`
- Morph counts: Eye: 31, Eyebrow: 24, Lip: 65, Other: 55, System: 16; total: 191.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `真面目` | `S_16` | Eyebrow | Vertex | — |
| 1 | `真面目L` | `S_16` | Eyebrow | Vertex | — |
| 2 | `真面目R` | `S_16` | Eyebrow | Vertex | — |
| 3 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 4 | `怒りL` | `B_Anger` | Eyebrow | Vertex | — |
| 5 | `怒りR` | `B_Anger` | Eyebrow | Vertex | — |
| 6 | `にこり` | `B_Happy` | Eyebrow | Vertex | — |
| 7 | `にこりL` | `B_Happy` | Eyebrow | Vertex | — |
| 8 | `にこりR` | `B_Happy` | Eyebrow | Vertex | — |
| 9 | `にこり2` | `B_Cheerful` | Eyebrow | Vertex | — |
| 10 | `困る` | `B_Sad` | Eyebrow | Vertex | sad |
| 11 | `困るL` | `B_Sad` | Eyebrow | Vertex | — |
| 12 | `困るR` | `B_Sad` | Eyebrow | Vertex | — |
| 13 | `平行` | `B_Flat` | Eyebrow | Vertex | — |
| 14 | `怪訝右` | `B_AH_R` | Eyebrow | Vertex | — |
| 15 | `怪訝左` | `B_AH_L` | Eyebrow | Vertex | — |
| 16 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 17 | `上L` | `B_Up_Add` | Eyebrow | Vertex | — |
| 18 | `上R` | `B_Up_Add` | Eyebrow | Vertex | — |
| 19 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 20 | `下L` | `B_Down_Add` | Eyebrow | Vertex | — |
| 21 | `下R` | `B_Down_Add` | Eyebrow | Vertex | — |
| 22 | `中` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 23 | `眉細` | `S_10` | Eyebrow | Vertex | — |
| 24 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 25 | `笑い` | `E_Smile_R` | Eye | Vertex | smileEyes |
| 26 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 27 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 28 | `ウィンク２` | `E_Close` | Eye | Vertex | — |
| 29 | `ｳｨﾝｸ２右` | `E_Close` | Eye | Vertex | — |
| 30 | `はぅ` | — | Eye | Vertex | — |
| 31 | `はちゅ目` | — | Eye | Vertex | — |
| 32 | `なごみ` | — | Eye | Vertex | — |
| 33 | `なごみL` | — | Eye | Vertex | — |
| 34 | `なごみR` | — | Eye | Vertex | — |
| 35 | `ｷﾘｯ` | `E_Anger` | Eye | Vertex | — |
| 36 | `垂れ目` | `E_Sad` | Eye | Vertex | — |
| 37 | `じと目2` | `E_Focus` | Eye | Vertex | — |
| 38 | `垂れ目2` | `S_15` | Eye | Vertex | — |
| 39 | `平目` | `S_17` | Eye | Vertex | — |
| 40 | `じと目3` | `S_19` | Eye | Vertex | — |
| 41 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 42 | `じと目L` | `E_Insipid` | Eye | Vertex | — |
| 43 | `じと目R` | `E_Insipid` | Eye | Vertex | — |
| 44 | `笑い目` | `E_Blephar` | Eye | Vertex | — |
| 45 | `星目` | — | Eye | Vertex | — |
| 46 | `はぁと` | — | Eye | Vertex | — |
| 47 | `up` | `Pupil_Up` | Eye | Vertex | — |
| 48 | `down` | `Pupil_Down` | Eye | Vertex | — |
| 49 | `right` | `Pupil_R` | Eye | Vertex | — |
| 50 | `left` | `Pupil_L` | Eye | Vertex | — |
| 51 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 52 | `瞳小L` | `Pupil_Scale` | Eye | Vertex | — |
| 53 | `瞳小R` | `Pupil_Scale` | Eye | Vertex | — |
| 54 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 55 | `あ` | — | Lip | Vertex | a |
| 56 | `あ4` | `A` | Lip | Vertex | — |
| 57 | `い` | `I` | Lip | Vertex | i |
| 58 | `う` | `U` | Lip | Vertex | u |
| 59 | `え` | `M_A` | Lip | Vertex | e |
| 60 | `お` | `O` | Lip | Vertex | o |
| 61 | `口` | `Aa` | Lip | Vertex | — |
| 62 | `え2` | `E` | Lip | Vertex | — |
| 63 | `にやり` | `M_Smile_R` | Lip | Vertex | smile |
| 64 | `∧` | `M_Ennui_R` | Lip | Vertex | — |
| 65 | `ぺろっ` | — | Lip | Vertex | — |
| 66 | `口角上げ` | `M_Smile_R` | Lip | Vertex | — |
| 67 | `口角下げ` | `M_Ennui_R` | Lip | Vertex | — |
| 68 | `口横広げ` | `P_M_R_Add` | Lip | Vertex | — |
| 69 | `口横狭め` | `P_M_Scale_Add` | Lip | Vertex | — |
| 70 | `右口角上げ` | `M_Smile_R` | Lip | Vertex | — |
| 71 | `左口角上げ` | `M_Smile_L` | Lip | Vertex | — |
| 72 | `右口角下げ` | `M_Ennui_R` | Lip | Vertex | — |
| 73 | `左口角下げ` | `M_Ennui_L` | Lip | Vertex | — |
| 74 | `い3` | `M_OpenSmall` | Lip | Vertex | — |
| 75 | `いい` | `M_Laugh` | Lip | Vertex | — |
| 76 | `д` | `M_Scared` | Lip | Vertex | — |
| 77 | `い2` | `M_ScaredTooth` | Lip | Vertex | — |
| 78 | `(○｀ε´○)` | `M_Anger` | Lip | Vertex | — |
| 79 | `あ２` | `M_Trapezoid` | Lip | Vertex | — |
| 80 | `お2` | `M_O` | Lip | Vertex | — |
| 81 | `M` | `M_Nutcracker` | Lip | Vertex | — |
| 82 | `右口横広げ` | `P_M_R_Add` | Lip | Vertex | — |
| 83 | `左口横広げ` | `P_M_L_Add` | Lip | Vertex | — |
| 84 | `右口角上げ2` | `P_M_ZR_Add` | Lip | Vertex | — |
| 85 | `左口角上げ2` | `P_M_ZL_Add` | Lip | Vertex | — |
| 86 | `いい2` | `S_01` | Lip | Vertex | — |
| 87 | `いい3` | `S_02` | Lip | Vertex | — |
| 88 | `ワ` | `S_03` | Lip | Vertex | — |
| 89 | `いい4` | `S_04` | Lip | Vertex | — |
| 90 | `口平` | `S_05` | Lip | Vertex | — |
| 91 | `lip back` | `S_06` | Lip | Vertex | — |
| 92 | `lip back2` | `S_07` | Lip | Vertex | — |
| 93 | `いい5` | `S_08` | Lip | Vertex | — |
| 94 | `いい6` | `S_09` | Lip | Vertex | — |
| 95 | `え5` | `S_11` | Lip | Vertex | — |
| 96 | `左い` | `S_12` | Lip | Vertex | — |
| 97 | `は？` | `S_13` | Lip | Vertex | — |
| 98 | `う＿` | `S_14` | Lip | Vertex | — |
| 99 | `ee` | `S_18` | Lip | Vertex | — |
| 100 | `hu~` | `S_20` | Lip | Vertex | — |
| 101 | `くぬぬ～` | `S_21` | Lip | Vertex | — |
| 102 | `くぬぬ～2` | `S_22` | Lip | Vertex | — |
| 103 | `くぬぬ～3` | `S_23` | Lip | Vertex | — |
| 104 | `teeth up` | `S_24` | Lip | Vertex | — |
| 105 | `くぬ` | `S_25` | Lip | Vertex | — |
| 106 | `舌小` | `S_26` | Lip | Vertex | — |
| 107 | `舌下` | `S_27` | Lip | Vertex | — |
| 108 | `lip off` | `S_28` | Lip | Vertex | — |
| 109 | `口左斜` | `S_29` | Lip | Vertex | — |
| 110 | `口右斜` | `S_30` | Lip | Vertex | — |
| 111 | `口口` | `Scda_Head01` | Lip | Vertex | — |
| 112 | `口口右` | `Scda_Head02` | Lip | Vertex | — |
| 113 | `lip thick` | `C_M_Distant` | Lip | Vertex | — |
| 114 | `口上` | `P_M_Up_Add` | Lip | Vertex | — |
| 115 | `口下` | `P_M_Down_Add` | Lip | Vertex | — |
| 116 | `口右` | `P_M_RMove_Add` | Lip | Vertex | — |
| 117 | `口左` | `P_M_LMove_Add` | Lip | Vertex | — |
| 118 | `lip thin` | `P_M_MidPoint_Add` | Lip | Vertex | — |
| 119 | `口後` | `P_M_UpDownView_Add` | Lip | Vertex | — |
| 120 | `照れ` | — | Other | Vertex | — |
| 121 | `照れ2` | — | Other | Vertex | — |
| 122 | `eye al` | — | Other | Material | — |
| 123 | `eye hi1 al` | — | Other | Material | — |
| 124 | `eye hi2 al` | — | Other | Material | — |
| 125 | `eye off` | — | Other | Material | — |
| 126 | `eye hi1 off` | — | Other | Material | — |
| 127 | `eye hi2 off` | — | Other | Material | — |
| 128 | `heng al` | — | Other | Material | — |
| 129 | `C_ZR_Face` | `C_ZR_Face` | Other | Vertex | — |
| 130 | `C_ZL_Face` | `C_ZL_Face` | Other | Vertex | — |
| 131 | `C_Down_Face` | `C_Down_Face` | Other | Vertex | — |
| 132 | `C_Up_Face` | `C_Up_Face` | Other | Vertex | — |
| 133 | `鼻上` | `P_Nose_Up` | Other | Vertex | — |
| 134 | `鼻下` | `P_Nose_Down` | Other | Vertex | — |
| 135 | `L_P` | `L_P` | Other | Vertex | — |
| 136 | `L_F` | `L_F` | Other | Vertex | — |
| 137 | `L_B` | `L_B` | Other | Vertex | — |
| 138 | `L_F_U` | `L_F_U` | Other | Vertex | — |
| 139 | `L_B_U` | `L_B_U` | Other | Vertex | — |
| 140 | `L_Up` | `L_Up` | Other | Vertex | — |
| 141 | `L_Up_U` | `L_Up_U` | Other | Vertex | — |
| 142 | `R_P` | `R_P` | Other | Vertex | — |
| 143 | `R_F` | `R_F` | Other | Vertex | — |
| 144 | `R_B` | `R_B` | Other | Vertex | — |
| 145 | `R_F_U` | `R_F_U` | Other | Vertex | — |
| 146 | `R_B_U` | `R_B_U` | Other | Vertex | — |
| 147 | `R_Up` | `R_Up` | Other | Vertex | — |
| 148 | `R_Up_U` | `R_Up_U` | Other | Vertex | — |
| 149 | `見開く` | — | Other | Group | — |
| 150 | `にこりB` | — | Other | Group | — |
| 151 | `困るB` | — | Other | Group | — |
| 152 | `怒りB` | — | Other | Group | — |
| 153 | `にこりA` | — | Other | Group | — |
| 154 | `真面目A` | — | Other | Group | — |
| 155 | `困るA` | — | Other | Group | — |
| 156 | `怒りA` | — | Other | Group | — |
| 157 | `笑いA` | — | Other | Group | — |
| 158 | `まばたきA` | — | Other | Group | — |
| 159 | `寄り目` | — | Other | Bone | — |
| 160 | `+目下` | — | Other | Bone | — |
| 161 | `+目上` | — | Other | Bone | — |
| 162 | `emo3左` | — | System | Vertex | — |
| 163 | `emo3右` | — | System | Vertex | — |
| 164 | `emo3上` | — | System | Vertex | — |
| 165 | `nu` | — | System | UV | — |
| 166 | `haha` | — | System | UV | — |
| 167 | `han` | — | System | UV | — |
| 168 | `xin` | — | System | UV | — |
| 169 | `jing` | — | System | UV | — |
| 170 | `heixian` | — | System | UV | — |
| 171 | `wenhao` | — | System | UV | — |
| 172 | `handi` | — | System | UV | — |
| 173 | `jingtanhao` | — | System | UV | — |
| 174 | `zhuyi` | — | System | UV | — |
| 175 | `luanma` | — | System | UV | — |
| 176 | `keshui` | — | System | UV | — |
| 177 | `shenluehao` | — | System | UV | — |
| 178 | `(#｀皿´)` | — | Other | Group | — |
| 179 | `O(∩_∩)O` | — | Other | Group | — |
| 180 | `(-ω-；)` | — | Other | Group | — |
| 181 | `喜(=゜ω゜)ノ` | — | Other | Group | — |
| 182 | `∑(´△｀)！` | — | Other | Group | — |
| 183 | `-﹏-&#124;&#124;&#124;` | — | Other | Group | — |
| 184 | `[・_・?]` | — | Other | Group | — |
| 185 | `(｡ω｡；)` | — | Other | Group | — |
| 186 | `(´△｀)！` | — | Other | Group | — |
| 187 | `d(^^*)` | — | Other | Group | — |
| 188 | `彡(-_-;)彡` | — | Other | Group | — |
| 189 | `(。-ω-)zzz` | — | Other | Group | — |
| 190 | `(¬_¬)ﾉ…` | — | Other | Group | — |

<a id="model-29"></a>
### 29. New MMD Model

- Format: PMX
- Asset path: —
- Embedded name: `鳴潮_女漂泊者(school suit)`
- Embedded English name: `New MMD Model`
- Cache file: `89bf402cfc0b9926f6535fbf4165d02eaac25fc4993dc7e860fe6c1238ccc7e5.asset`
- Morph counts: Eye: 29, Eyebrow: 23, Lip: 51, Other: 56, System: 16; total: 175.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `真面目` | — | Eyebrow | Vertex | — |
| 1 | `真面目L` | — | Eyebrow | Vertex | — |
| 2 | `真面目R` | — | Eyebrow | Vertex | — |
| 3 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 4 | `怒りL` | `B_Anger` | Eyebrow | Vertex | — |
| 5 | `怒りR` | `B_Anger` | Eyebrow | Vertex | — |
| 6 | `にこり` | `B_Happy` | Eyebrow | Vertex | — |
| 7 | `にこりL` | `B_Happy` | Eyebrow | Vertex | — |
| 8 | `にこりR` | `B_Happy` | Eyebrow | Vertex | — |
| 9 | `にこり2` | `B_Cheerful` | Eyebrow | Vertex | — |
| 10 | `困る` | `B_Sad` | Eyebrow | Vertex | sad |
| 11 | `困るL` | `B_Sad` | Eyebrow | Vertex | — |
| 12 | `困るR` | `B_Sad` | Eyebrow | Vertex | — |
| 13 | `平行` | `B_Flat` | Eyebrow | Vertex | — |
| 14 | `怪訝右` | `B_AH_R` | Eyebrow | Vertex | — |
| 15 | `怪訝左` | `B_AH_L` | Eyebrow | Vertex | — |
| 16 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 17 | `上L` | `B_Up_Add` | Eyebrow | Vertex | — |
| 18 | `上R` | `B_Up_Add` | Eyebrow | Vertex | — |
| 19 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 20 | `下L` | `B_Down_Add` | Eyebrow | Vertex | — |
| 21 | `下R` | `B_Down_Add` | Eyebrow | Vertex | — |
| 22 | `中` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 23 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 24 | `笑い` | `E_Smile_R` | Eye | Vertex | smileEyes |
| 25 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 26 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 27 | `ウィンク２` | `E_Close` | Eye | Vertex | — |
| 28 | `ｳｨﾝｸ２右` | `E_Close` | Eye | Vertex | — |
| 29 | `はぅ` | — | Eye | Vertex | — |
| 30 | `はちゅ目` | — | Eye | Vertex | — |
| 31 | `なごみ` | — | Eye | Vertex | — |
| 32 | `なごみL` | — | Eye | Vertex | — |
| 33 | `なごみR` | — | Eye | Vertex | — |
| 34 | `ｷﾘｯ` | `E_Anger` | Eye | Vertex | — |
| 35 | `垂れ目` | `E_Sad` | Eye | Vertex | — |
| 36 | `じと目2` | `E_Focus` | Eye | Vertex | — |
| 37 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 38 | `じと目L` | `E_Insipid` | Eye | Vertex | — |
| 39 | `じと目R` | `E_Insipid` | Eye | Vertex | — |
| 40 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 41 | `笑い目` | `E_Blephar` | Eye | Vertex | — |
| 42 | `up` | `Pupil_Up` | Eye | Vertex | — |
| 43 | `down` | `Pupil_Down` | Eye | Vertex | — |
| 44 | `left` | `Pupil_L` | Eye | Vertex | — |
| 45 | `right` | `Pupil_R` | Eye | Vertex | — |
| 46 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 47 | `瞳小L` | `Pupil_Scale` | Eye | Vertex | — |
| 48 | `瞳小R` | `Pupil_Scale` | Eye | Vertex | — |
| 49 | `eye 風` | — | Eye | Material | — |
| 50 | `星目` | — | Eye | Vertex | — |
| 51 | `はぁと` | — | Eye | Vertex | — |
| 52 | `あ` | `A` | Lip | Vertex | a |
| 53 | `い` | `I` | Lip | Vertex | i |
| 54 | `う` | `U` | Lip | Vertex | u |
| 55 | `え` | `E` | Lip | Vertex | e |
| 56 | `お` | `O` | Lip | Vertex | o |
| 57 | `口` | `Aa` | Lip | Vertex | — |
| 58 | `にやり` | — | Lip | Vertex | smile |
| 59 | `∧` | `M_Ennui_R` | Lip | Vertex | — |
| 60 | `口角上げ` | `M_Smile_R` | Lip | Vertex | — |
| 61 | `口角下げ` | `M_Ennui_R` | Lip | Vertex | — |
| 62 | `口横広げ` | `P_M_R_Add` | Lip | Vertex | — |
| 63 | `口横狭め` | `P_M_Scale_Add` | Lip | Vertex | — |
| 64 | `右口角上げ` | `M_Smile_R` | Lip | Vertex | — |
| 65 | `左口角上げ` | `M_Smile_L` | Lip | Vertex | — |
| 66 | `右口角下げ` | `M_Ennui_R` | Lip | Vertex | — |
| 67 | `左口角下げ` | `M_Ennui_L` | Lip | Vertex | — |
| 68 | `右口横広げ` | `P_M_R_Add` | Lip | Vertex | — |
| 69 | `左口横広げ` | `P_M_L_Add` | Lip | Vertex | — |
| 70 | `ぺろっ` | — | Lip | Vertex | — |
| 71 | `い3` | `M_OpenSmall` | Lip | Vertex | — |
| 72 | `いい` | `M_Laugh` | Lip | Vertex | — |
| 73 | `д` | `M_Scared` | Lip | Vertex | — |
| 74 | `い2` | `M_ScaredTooth` | Lip | Vertex | — |
| 75 | `(○｀ε´○)` | `M_Anger` | Lip | Vertex | — |
| 76 | `あ２` | `M_Trapezoid` | Lip | Vertex | — |
| 77 | `お2` | `M_O` | Lip | Vertex | — |
| 78 | `あ3` | `M_A` | Lip | Vertex | — |
| 79 | `M` | `M_Nutcracker` | Lip | Vertex | — |
| 80 | `右口角上げ2` | `P_M_ZR_Add` | Lip | Vertex | — |
| 81 | `左口角上げ2` | `P_M_ZL_Add` | Lip | Vertex | — |
| 82 | `lip thick` | `C_M_Distant` | Lip | Vertex | — |
| 83 | `鼻上` | `P_Nose_Up` | Lip | Vertex | — |
| 84 | `鼻下` | `P_Nose_Down` | Lip | Vertex | — |
| 85 | `口上` | `P_M_Up_Add` | Lip | Vertex | — |
| 86 | `口下` | `P_M_Down_Add` | Lip | Vertex | — |
| 87 | `口右` | `P_M_RMove_Add` | Lip | Vertex | — |
| 88 | `口左` | `P_M_LMove_Add` | Lip | Vertex | — |
| 89 | `lip thin` | `P_M_MidPoint_Add` | Lip | Vertex | — |
| 90 | `口後` | `P_M_UpDownView_Add` | Lip | Vertex | — |
| 91 | `いい2` | `S_01` | Lip | Vertex | — |
| 92 | `ワ左` | `S_02` | Lip | Vertex | — |
| 93 | `いい左` | `S_03` | Lip | Vertex | — |
| 94 | `д左` | `S_04` | Lip | Vertex | — |
| 95 | `д左2` | `S_08` | Lip | Vertex | — |
| 96 | `歯上げ` | `S_24` | Lip | Vertex | — |
| 97 | `歯下げ` | `S_25` | Lip | Vertex | — |
| 98 | `舌下` | `S_26` | Lip | Vertex | — |
| 99 | `舌下2` | `S_27` | Lip | Vertex | — |
| 100 | `lip thin2` | `S_28` | Lip | Vertex | — |
| 101 | `口左斜` | `S_29` | Lip | Vertex | — |
| 102 | `口右斜` | `S_30` | Lip | Vertex | — |
| 103 | `照れ` | — | Other | Vertex | — |
| 104 | `照れ2` | — | Other | Vertex | — |
| 105 | `eye al` | — | Other | Material | — |
| 106 | `eye hi 2 al` | — | Other | Material | — |
| 107 | `eye hi1 al` | — | Other | Material | — |
| 108 | `eye off` | — | Other | Material | — |
| 109 | `eye hi 2 off` | — | Other | Material | — |
| 110 | `eye hi1 off` | — | Other | Material | — |
| 111 | `heng al` | — | Other | Material | — |
| 112 | `腹recover` | — | Other | Vertex | — |
| 113 | `腹 recover2` | — | Other | Material | — |
| 114 | `袖 recover2` | — | Other | Material | — |
| 115 | `L_P` | `L_P` | Other | Vertex | — |
| 116 | `L_F` | `L_F` | Other | Vertex | — |
| 117 | `L_B` | `L_B` | Other | Vertex | — |
| 118 | `L_F_U` | `L_F_U` | Other | Vertex | — |
| 119 | `L_B_U` | `L_B_U` | Other | Vertex | — |
| 120 | `L_Up` | `L_Up` | Other | Vertex | — |
| 121 | `L_Up_U` | `L_Up_U` | Other | Vertex | — |
| 122 | `R_P` | `R_P` | Other | Vertex | — |
| 123 | `R_F` | `R_F` | Other | Vertex | — |
| 124 | `R_B` | `R_B` | Other | Vertex | — |
| 125 | `R_F_U` | `R_F_U` | Other | Vertex | — |
| 126 | `R_B_U` | `R_B_U` | Other | Vertex | — |
| 127 | `R_Up` | `R_Up` | Other | Vertex | — |
| 128 | `R_Up_U` | `R_Up_U` | Other | Vertex | — |
| 129 | `emo3左` | — | System | Vertex | — |
| 130 | `emo3右` | — | System | Vertex | — |
| 131 | `emo3上` | — | System | Vertex | — |
| 132 | `nu` | — | System | UV | — |
| 133 | `haha` | — | System | UV | — |
| 134 | `han` | — | System | UV | — |
| 135 | `xin` | — | System | UV | — |
| 136 | `jing` | — | System | UV | — |
| 137 | `heixian` | — | System | UV | — |
| 138 | `wenhao` | — | System | UV | — |
| 139 | `handi` | — | System | UV | — |
| 140 | `jingtanhao` | — | System | UV | — |
| 141 | `zhuyi` | — | System | UV | — |
| 142 | `luanma` | — | System | UV | — |
| 143 | `keshui` | — | System | UV | — |
| 144 | `shenluehao` | — | System | UV | — |
| 145 | `(#｀皿´)` | — | Other | Group | — |
| 146 | `O(∩_∩)O` | — | Other | Group | — |
| 147 | `(-ω-；)` | — | Other | Group | — |
| 148 | `喜(=゜ω゜)ノ` | — | Other | Group | — |
| 149 | `∑(´△｀)！` | — | Other | Group | — |
| 150 | `-﹏-&#124;&#124;&#124;` | — | Other | Group | — |
| 151 | `[・_・?]` | — | Other | Group | — |
| 152 | `(｡ω｡；)` | — | Other | Group | — |
| 153 | `(´△｀)！` | — | Other | Group | — |
| 154 | `d(^^*)` | — | Other | Group | — |
| 155 | `彡(-_-;)彡` | — | Other | Group | — |
| 156 | `(。-ω-)zzz` | — | Other | Group | — |
| 157 | `(¬_¬)ﾉ…` | — | Other | Group | — |
| 158 | `見開く` | — | Other | Group | — |
| 159 | `にこりB` | — | Other | Group | — |
| 160 | `困るB` | — | Other | Group | — |
| 161 | `怒りB` | — | Other | Group | — |
| 162 | `にこりA` | — | Other | Group | — |
| 163 | `真面目A` | — | Other | Group | — |
| 164 | `困るA` | — | Other | Group | — |
| 165 | `怒りA` | — | Other | Group | — |
| 166 | `笑いA` | — | Other | Group | — |
| 167 | `まばたきA` | — | Other | Group | — |
| 168 | `寄り目` | — | Other | Bone | — |
| 169 | `+目下` | — | Other | Bone | — |
| 170 | `+目上` | — | Other | Bone | — |
| 171 | `C_ZR_Face` | `C_ZR_Face` | Other | Vertex | — |
| 172 | `C_ZL_Face` | `C_ZL_Face` | Other | Vertex | — |
| 173 | `C_Down_Face` | `C_Down_Face` | Other | Vertex | — |
| 174 | `C_Up_Face` | `C_Up_Face` | Other | Vertex | — |

<a id="model-30"></a>
### 30. New MMD Model

- Format: PMX
- Asset path: —
- Embedded name: `鳴潮_嘉貝莉娜`
- Embedded English name: `New MMD Model`
- Cache file: `d62d6d33018d08ec411350ecd27cadd6f868debed042b3e93e2678505550c67b.asset`
- Morph counts: Eye: 31, Eyebrow: 24, Lip: 57, Other: 33, System: 16; total: 161.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `真面目` | `fasband.S_02` | Eyebrow | Vertex | — |
| 1 | `真面目L` | `fasband.S_02` | Eyebrow | Vertex | — |
| 2 | `真面目R` | `fasband.S_02` | Eyebrow | Vertex | — |
| 3 | `怒り` | `fasband.B_Anger` | Eyebrow | Vertex | angry |
| 4 | `怒りL` | `fasband.B_Anger` | Eyebrow | Vertex | — |
| 5 | `怒りR` | `fasband.B_Anger` | Eyebrow | Vertex | — |
| 6 | `にこり` | `fasband.B_Happy` | Eyebrow | Vertex | — |
| 7 | `にこりL` | `fasband.B_Happy` | Eyebrow | Vertex | — |
| 8 | `にこりR` | `fasband.B_Happy` | Eyebrow | Vertex | — |
| 9 | `にこり2` | `fasband.B_Cheerful` | Eyebrow | Vertex | — |
| 10 | `困る` | `fasband.B_Sad` | Eyebrow | Vertex | sad |
| 11 | `困るL` | `fasband.B_Sad` | Eyebrow | Vertex | — |
| 12 | `困るR` | `fasband.B_Sad` | Eyebrow | Vertex | — |
| 13 | `平行` | `fasband.B_Flat` | Eyebrow | Vertex | — |
| 14 | `怪訝右` | `fasband.B_AH_R` | Eyebrow | Vertex | — |
| 15 | `怪訝左` | `fasband.B_AH_L` | Eyebrow | Vertex | — |
| 16 | `眉後2` | `fasband.S_10` | Eyebrow | Vertex | — |
| 17 | `上` | `fasband.B_Up_Add` | Eyebrow | Vertex | — |
| 18 | `上L` | `fasband.B_Up_Add` | Eyebrow | Vertex | — |
| 19 | `上R` | `fasband.B_Up_Add` | Eyebrow | Vertex | — |
| 20 | `下` | `fasband.B_Down_Add` | Eyebrow | Vertex | — |
| 21 | `下L` | `fasband.B_Down_Add` | Eyebrow | Vertex | — |
| 22 | `下R` | `fasband.B_Down_Add` | Eyebrow | Vertex | — |
| 23 | `中` | `fasband.B_Inside_Add` | Eyebrow | Vertex | — |
| 24 | `まばたき` | `fasband.E_Close` | Eye | Vertex | blink |
| 25 | `笑い` | `fasband.E_Smile_R` | Eye | Vertex | smileEyes |
| 26 | `ウィンク` | `fasband.E_Smile_L` | Eye | Vertex | — |
| 27 | `ウィンク右` | `fasband.E_Smile_R` | Eye | Vertex | — |
| 28 | `ウィンク２` | `fasband.E_Close` | Eye | Vertex | — |
| 29 | `ｳｨﾝｸ２右` | `fasband.E_Close` | Eye | Vertex | — |
| 30 | `びっくり` | `fasband2.E_Stare` | Eye | Vertex | surprised |
| 31 | `はぅ` | — | Eye | Vertex | — |
| 32 | `はちゅ目` | — | Eye | Vertex | — |
| 33 | `なごみ` | — | Eye | Vertex | — |
| 34 | `なごみL` | — | Eye | Vertex | — |
| 35 | `なごみR` | — | Eye | Vertex | — |
| 36 | `ｷﾘｯ` | `fasband.E_Anger` | Eye | Vertex | — |
| 37 | `垂れ目` | `fasband.E_Sad` | Eye | Vertex | — |
| 38 | `じと目2` | `fasband.E_Focus` | Eye | Vertex | — |
| 39 | `じと目` | `fasband.E_Insipid` | Eye | Vertex | — |
| 40 | `じと目L` | `fasband.E_Insipid` | Eye | Vertex | — |
| 41 | `じと目R` | `fasband.E_Insipid` | Eye | Vertex | — |
| 42 | `笑い目` | `fasband.E_Blephar` | Eye | Vertex | — |
| 43 | `up` | `fasband2.Pupil_Up` | Eye | Vertex | — |
| 44 | `down` | `fasband2.Pupil_Down` | Eye | Vertex | — |
| 45 | `right` | `fasband2.Pupil_R` | Eye | Vertex | — |
| 46 | `left` | `fasband2.Pupil_L` | Eye | Vertex | — |
| 47 | `瞳小` | `fasband2.Pupil_Scale` | Eye | Vertex | — |
| 48 | `瞳小L` | `fasband2.Pupil_Scale` | Eye | Vertex | — |
| 49 | `瞳小R` | `fasband2.Pupil_Scale` | Eye | Vertex | — |
| 50 | `びっくり2` | `fasband.S_01` | Eye | Vertex | — |
| 51 | `目大` | `fasband.S_03` | Eye | Vertex | — |
| 52 | `じと目3` | `fasband.S_04` | Eye | Vertex | — |
| 53 | `星目` | — | Eye | Vertex | — |
| 54 | `はぁと` | — | Eye | Vertex | — |
| 55 | `あ` | `fasband.A` | Lip | Vertex | a |
| 56 | `い` | `fasband.I` | Lip | Vertex | i |
| 57 | `う` | `fasband.U` | Lip | Vertex | u |
| 58 | `え` | `fasband.E` | Lip | Vertex | e |
| 59 | `お` | `fasband.O` | Lip | Vertex | o |
| 60 | `口` | `fasband.Aa` | Lip | Vertex | — |
| 61 | `にやり` | — | Lip | Vertex | smile |
| 62 | `∧` | — | Lip | Vertex | — |
| 63 | `口角上げ` | `fasband.M_Smile_R` | Lip | Vertex | — |
| 64 | `口角下げ` | `fasband.M_Ennui_R` | Lip | Vertex | — |
| 65 | `口横広げ` | `fasband.P_M_R_Add` | Lip | Vertex | — |
| 66 | `口横狭め` | `fasband.P_M_Scale_Add` | Lip | Vertex | — |
| 67 | `右口角上げ` | `fasband.M_Smile_R` | Lip | Vertex | — |
| 68 | `左口角上げ` | `fasband.M_Smile_L` | Lip | Vertex | — |
| 69 | `右口角下げ` | `fasband.M_Ennui_R` | Lip | Vertex | — |
| 70 | `左口角下げ` | `fasband.M_Ennui_L` | Lip | Vertex | — |
| 71 | `右口横広げ` | `fasband.P_M_R_Add` | Lip | Vertex | — |
| 72 | `左口横広げ` | `fasband.P_M_L_Add` | Lip | Vertex | — |
| 73 | `い3` | `fasband.M_OpenSmall` | Lip | Vertex | — |
| 74 | `いい` | `fasband.M_Laugh` | Lip | Vertex | — |
| 75 | `д` | `fasband.M_Scared` | Lip | Vertex | — |
| 76 | `い2` | `fasband.M_ScaredTooth` | Lip | Vertex | — |
| 77 | `(○｀ε´○)` | `fasband.M_Anger` | Lip | Vertex | — |
| 78 | `ぺろっ` | — | Lip | Vertex | — |
| 79 | `あ２` | `fasband.M_Trapezoid` | Lip | Vertex | — |
| 80 | `お2` | `fasband.M_O` | Lip | Vertex | — |
| 81 | `あ3` | `fasband.M_A` | Lip | Vertex | — |
| 82 | `M` | `fasband.M_Nutcracker` | Lip | Vertex | — |
| 83 | `右口角上げ2` | `fasband.P_M_ZR_Add` | Lip | Vertex | — |
| 84 | `左口角上げ2` | `fasband.P_M_ZL_Add` | Lip | Vertex | — |
| 85 | `C_ZR_Face` | `fasband.C_ZR_Face` | Lip | Vertex | — |
| 86 | `C_ZL_Face` | `fasband.C_ZL_Face` | Lip | Vertex | — |
| 87 | `C_Down_Face` | `fasband.C_Down_Face` | Lip | Vertex | — |
| 88 | `C_Up_Face` | `fasband.C_Up_Face` | Lip | Vertex | — |
| 89 | `lip thick` | `fasband.C_M_Distant` | Lip | Vertex | — |
| 90 | `lip thin 2` | `fasband.S_28` | Lip | Vertex | — |
| 91 | `口zhuan右` | `fasband.S_29` | Lip | Vertex | — |
| 92 | `口zhuan左` | `fasband.S_30` | Lip | Vertex | — |
| 93 | `ｷﾘｯ2` | `fasband.Scda_Head01` | Lip | Vertex | — |
| 94 | `左いい` | `fasband.Scda_Head02` | Lip | Vertex | — |
| 95 | `口左2` | `fasband.Scda_Head03` | Lip | Vertex | — |
| 96 | `鼻上` | `fasband.P_Nose_Up` | Lip | Vertex | — |
| 97 | `鼻下` | `fasband.P_Nose_Down` | Lip | Vertex | — |
| 98 | `口上` | `fasband.P_M_Up_Add` | Lip | Vertex | — |
| 99 | `口下` | `fasband.P_M_Down_Add` | Lip | Vertex | — |
| 100 | `口右` | `fasband.P_M_RMove_Add` | Lip | Vertex | — |
| 101 | `口左` | `fasband.P_M_LMove_Add` | Lip | Vertex | — |
| 102 | `lip thin` | `fasband.P_M_MidPoint_Add` | Lip | Vertex | — |
| 103 | `口後` | `fasband.P_M_UpDownView_Add` | Lip | Vertex | — |
| 104 | `lip thin3` | `fasband.S_06` | Lip | Vertex | — |
| 105 | `lip thin4` | `fasband.S_07` | Lip | Vertex | — |
| 106 | `いい4` | `fasband.S_08` | Lip | Vertex | — |
| 107 | `口小` | `fasband.S_09` | Lip | Vertex | — |
| 108 | `上牙上` | `fasband.S_24` | Lip | Vertex | — |
| 109 | `上牙下` | `fasband.S_25` | Lip | Vertex | — |
| 110 | `下牙上` | `fasband.S_26` | Lip | Vertex | — |
| 111 | `下牙下` | `fasband.S_27` | Lip | Vertex | — |
| 112 | `照れ` | — | Other | Vertex | — |
| 113 | `照れ2` | — | Other | Vertex | — |
| 114 | `見開く` | — | Other | Group | — |
| 115 | `にこりB` | — | Other | Group | — |
| 116 | `困るB` | — | Other | Group | — |
| 117 | `怒りB` | — | Other | Group | — |
| 118 | `にこりA` | — | Other | Group | — |
| 119 | `真面目A` | — | Other | Group | — |
| 120 | `困るA` | — | Other | Group | — |
| 121 | `怒りA` | — | Other | Group | — |
| 122 | `笑いA` | — | Other | Group | — |
| 123 | `まばたきA` | — | Other | Group | — |
| 124 | `寄り目` | — | Other | Bone | — |
| 125 | `+目下` | — | Other | Bone | — |
| 126 | `+目上` | — | Other | Bone | — |
| 127 | `emo3左` | — | System | Vertex | — |
| 128 | `emo3右` | — | System | Vertex | — |
| 129 | `emo3上` | — | System | Vertex | — |
| 130 | `nu` | — | System | UV | — |
| 131 | `haha` | — | System | UV | — |
| 132 | `han` | — | System | UV | — |
| 133 | `xin` | — | System | UV | — |
| 134 | `jing` | — | System | UV | — |
| 135 | `heixian` | — | System | UV | — |
| 136 | `wenhao` | — | System | UV | — |
| 137 | `handi` | — | System | UV | — |
| 138 | `jingtanhao` | — | System | UV | — |
| 139 | `zhuyi` | — | System | UV | — |
| 140 | `luanma` | — | System | UV | — |
| 141 | `keshui` | — | System | UV | — |
| 142 | `shenluehao` | — | System | UV | — |
| 143 | `(#｀皿´)` | — | Other | Group | — |
| 144 | `O(∩_∩)O` | — | Other | Group | — |
| 145 | `(-ω-；)` | — | Other | Group | — |
| 146 | `喜(=゜ω゜)ノ` | — | Other | Group | — |
| 147 | `∑(´△｀)！` | — | Other | Group | — |
| 148 | `-﹏-&#124;&#124;&#124;` | — | Other | Group | — |
| 149 | `[・_・?]` | — | Other | Group | — |
| 150 | `(｡ω｡；)` | — | Other | Group | — |
| 151 | `(´△｀)！` | — | Other | Group | — |
| 152 | `d(^^*)` | — | Other | Group | — |
| 153 | `彡(-_-;)彡` | — | Other | Group | — |
| 154 | `(。-ω-)zzz` | — | Other | Group | — |
| 155 | `(¬_¬)ﾉ…` | — | Other | Group | — |
| 156 | `eye al` | — | Other | Material | — |
| 157 | `eye hi al` | — | Other | Material | — |
| 158 | `heng al` | — | Other | Material | — |
| 159 | `eye off` | — | Other | Material | — |
| 160 | `eye hi off` | — | Other | Material | — |

<a id="model-31"></a>
### 31. New MMD Model

- Format: PMX
- Asset path: —
- Embedded name: `Shinku_JK`
- Embedded English name: `New MMD Model`
- Cache file: `db6c62de50fb63e098505db7d66600b6e17077de35bb99abac270e6b58af68aa.asset`
- Morph counts: Eye: 53, Eyebrow: 21, Lip: 35, Other: 11, System: 2; total: 122.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `まばたき` | `まばたき` | Eye | Vertex | blink |
| 1 | `笑い` | `笑い` | Eye | Vertex | smileEyes |
| 2 | `ウィンク右` | `ウィンク右` | Eye | Vertex | — |
| 3 | `ウィンク` | `ウィンク` | Eye | Vertex | — |
| 4 | `ｳｨﾝｸ２右` | `ｳｨﾝｸ２右` | Eye | Vertex | — |
| 5 | `ウィンク２` | `ウィンク２` | Eye | Vertex | — |
| 6 | `びっくり` | `びっくり` | Eye | Vertex | surprised |
| 7 | `ｷﾘｯ` | `ｷﾘｯ` | Eye | Vertex | — |
| 8 | `目を細める` | `目を細める` | Eye | Vertex | — |
| 9 | `ｷﾘｯ2` | `ｷﾘｯ2` | Eye | Vertex | — |
| 10 | `じと目` | `じと目` | Eye | Vertex | — |
| 11 | `瞳小` | `瞳小` | Eye | Vertex | — |
| 12 | `ハイライト消` | `ハイライト消` | Eye | Vertex | — |
| 13 | `look_U` | `look_U` | Eye | Vertex | — |
| 14 | `look_RU` | `look_RU` | Eye | Vertex | — |
| 15 | `look_R` | `look_R` | Eye | Vertex | — |
| 16 | `look_RD` | `look_RD` | Eye | Vertex | — |
| 17 | `look_D` | `look_D` | Eye | Vertex | — |
| 18 | `look_LD` | `look_LD` | Eye | Vertex | — |
| 19 | `look_L` | `look_L` | Eye | Vertex | — |
| 20 | `look_LU` | `look_LU` | Eye | Vertex | — |
| 21 | `EL_Happy_l_CLO` | `EL_Happy_l_CLO` | Eye | Vertex | — |
| 22 | `EL_Happy_r_CLO` | `EL_Happy_r_CLO` | Eye | Vertex | — |
| 23 | `EL_Surprised_01` | `EL_Surprised_01` | Eye | Vertex | — |
| 24 | `EL_Smile_01_CLO` | `EL_Smile_01_CLO` | Eye | Vertex | smile |
| 25 | `EL_Angry_01_OP` | `EL_Angry_01_OP` | Eye | Vertex | — |
| 26 | `EL_Angry_01_CLO` | `EL_Angry_01_CLO` | Eye | Vertex | — |
| 27 | `EL_Sad_01_OP` | `EL_Sad_01_OP` | Eye | Vertex | — |
| 28 | `EL_Sad_01_CLO` | `EL_Sad_01_CLO` | Eye | Vertex | — |
| 29 | `EL_Despise_01_OP` | `EL_Despise_01_OP` | Eye | Vertex | — |
| 30 | `EL_Despise_01_CLO` | `EL_Despise_01_CLO` | Eye | Vertex | — |
| 31 | `EL_Doubt_01_OP` | `EL_Doubt_01_OP` | Eye | Vertex | — |
| 32 | `EL_Doubt_01_CLO` | `EL_Doubt_01_CLO` | Eye | Vertex | — |
| 33 | `EL_Evil_01_OP` | `EL_Evil_01_OP` | Eye | Vertex | — |
| 34 | `EL_Evil_01_CLO` | `EL_Evil_01_CLO` | Eye | Vertex | — |
| 35 | `EL_Tired_01_OP` | `EL_Tired_01_OP` | Eye | Vertex | — |
| 36 | `EL_Tired_01_CLO` | `EL_Tired_01_CLO` | Eye | Vertex | — |
| 37 | `EL_Serious_01_OP` | `EL_Serious_01_OP` | Eye | Vertex | — |
| 38 | `EL_Serious_01_CLO` | `EL_Serious_01_CLO` | Eye | Vertex | — |
| 39 | `EL_Thinking_01_OP` | `EL_Thinking_01_OP` | Eye | Vertex | — |
| 40 | `EL_Thinking_01_CLO` | `EL_Thinking_01_CLO` | Eye | Vertex | — |
| 41 | `biyan_R` | `biyan_R` | Eye | Vertex | — |
| 42 | `biyan_L` | `biyan_L` | Eye | Vertex | — |
| 43 | `biyan` | `biyan` | Eye | Vertex | — |
| 44 | `biyan1` | `biyan1` | Eye | Vertex | — |
| 45 | `EL_Down` | `EL_Down` | Eye | Vertex | — |
| 46 | `EL_CornerDown` | `EL_CornerDown` | Eye | Vertex | — |
| 47 | `EL_CornerUp` | `EL_CornerUp` | Eye | Vertex | — |
| 48 | `eye_SF` | `eye_SF` | Eye | Vertex | — |
| 49 | `EL_Up` | `EL_Up` | Eye | Vertex | — |
| 50 | `EL_Light_Up` | `EL_Light_Up` | Eye | Vertex | — |
| 51 | `EL_Light_L` | `EL_Light_L` | Eye | Vertex | — |
| 52 | `EL_Light_Lose` | `EL_Light_Lose` | Eye | Vertex | — |
| 53 | `あ` | `あ` | Lip | Vertex | a |
| 54 | `い` | `い` | Lip | Vertex | i |
| 55 | `う` | `mouthFunnel` | Lip | Vertex | u |
| 56 | `え` | `え` | Lip | Vertex | e |
| 57 | `お` | `お` | Lip | Vertex | o |
| 58 | `あ2` | `あ2` | Lip | Vertex | — |
| 59 | `ワ` | `ワ` | Lip | Vertex | — |
| 60 | `jawOpen` | `jawOpen` | Lip | Vertex | — |
| 61 | `jawOpen_a` | `jawOpen_a` | Lip | Vertex | — |
| 62 | `jawOpen_yi` | `jawOpen_yi` | Lip | Vertex | — |
| 63 | `jawOpen_o` | `jawOpen_o` | Lip | Vertex | — |
| 64 | `jawOpen_Happy_01_OP` | `jawOpen_Happy_01_OP` | Lip | Vertex | — |
| 65 | `jawOpen_Happy_01_CLO` | `jawOpen_Happy_01_CLO` | Lip | Vertex | — |
| 66 | `jawOpen_Surprised_01_OP` | `jawOpen_Surprised_01_OP` | Lip | Vertex | — |
| 67 | `jawOpen_Surprised_01_CLO` | `jawOpen_Surprised_01_CLO` | Lip | Vertex | — |
| 68 | `jawOpen_Smile_01_OP` | `jawOpen_Smile_01_OP` | Lip | Vertex | — |
| 69 | `jawOpen_Smile_01_CLO` | `jawOpen_Smile_01_CLO` | Lip | Vertex | — |
| 70 | `jawOpen_Evil_01_OP` | `jawOpen_Evil_01_OP` | Lip | Vertex | — |
| 71 | `jawOpen_Evil_01_CLO` | `jawOpen_Evil_01_CLO` | Lip | Vertex | — |
| 72 | `jawOpen_Tired_01_OP` | `jawOpen_Tired_01_OP` | Lip | Vertex | — |
| 73 | `jawOpen_Tired_01_CLO` | `jawOpen_Tired_01_CLO` | Lip | Vertex | — |
| 74 | `mouthPucker` | `mouthPucker` | Lip | Vertex | — |
| 75 | `mouthRollUpper` | `mouthRollUpper` | Lip | Vertex | — |
| 76 | `mouthRollLower` | `mouthRollLower` | Lip | Vertex | — |
| 77 | `mouthFunnel` | `mouthFunnel` | Lip | Vertex | — |
| 78 | `jawOpen_wu` | `jawOpen_wu` | Lip | Vertex | — |
| 79 | `jawOpen_ei` | `jawOpen_ei` | Lip | Vertex | — |
| 80 | `jawOpen_Angry_01_OP` | `jawOpen_Angry_01_OP` | Lip | Vertex | — |
| 81 | `jawOpen_Angry_01_CLO` | `jawOpen_Angry_01_CLO` | Lip | Vertex | — |
| 82 | `jawOpen_Sad_01_OP` | `jawOpen_Sad_01_OP` | Lip | Vertex | — |
| 83 | `jawOpen_Sad_01_CLO` | `jawOpen_Sad_01_CLO` | Lip | Vertex | — |
| 84 | `jawOpen_Despise_01_OP` | `jawOpen_Despise_01_OP` | Lip | Vertex | — |
| 85 | `jawOpen_Despise_01_CLO` | `jawOpen_Despise_01_CLO` | Lip | Vertex | — |
| 86 | `jawOpen_Doubt_01_OP` | `jawOpen_Doubt_01_OP` | Lip | Vertex | — |
| 87 | `jawOpen_Doubt_01_CLO` | `jawOpen_Doubt_01_CLO` | Lip | Vertex | — |
| 88 | `真面目` | `真面目` | Eyebrow | Vertex | — |
| 89 | `にこり` | `にこり` | Eyebrow | Vertex | — |
| 90 | `怒り` | `怒り` | Eyebrow | Vertex | angry |
| 91 | `困る` | `困る` | Eyebrow | Vertex | sad |
| 92 | `左上` | `左上` | Eyebrow | Vertex | — |
| 93 | `右上` | `右上` | Eyebrow | Vertex | — |
| 94 | `EB_happy_01` | `EB_happy_01` | Eyebrow | Vertex | — |
| 95 | `EB_Surprised_01` | `EB_Surprised_01` | Eyebrow | Vertex | — |
| 96 | `EB_Smile_01` | `EB_Smile_01` | Eyebrow | Vertex | — |
| 97 | `EB_Angry_01` | `EB_Angry_01` | Eyebrow | Vertex | — |
| 98 | `EB_Sad_01` | `EB_Sad_01` | Eyebrow | Vertex | — |
| 99 | `EB_Despise_01` | `EB_Despise_01` | Eyebrow | Vertex | — |
| 100 | `EB_Doubt_01` | `EB_Doubt_01` | Eyebrow | Vertex | — |
| 101 | `EB_Evil_01` | `EB_Evil_01` | Eyebrow | Vertex | — |
| 102 | `EB_Tired_01` | `EB_Tired_01` | Eyebrow | Vertex | — |
| 103 | `EB_Serious_01` | `EB_Serious_01` | Eyebrow | Vertex | — |
| 104 | `EB_Thinking_01` | `EB_Thinking_01` | Eyebrow | Vertex | — |
| 105 | `EB_UD_L` | `EB_UD_L` | Eyebrow | Vertex | — |
| 106 | `EB_UD_R` | `EB_UD_R` | Eyebrow | Vertex | — |
| 107 | `EB_Rotate_01` | `EB_Rotate_01` | Eyebrow | Vertex | — |
| 108 | `EB_Rotate_02` | `EB_Rotate_02` | Eyebrow | Vertex | — |
| 109 | `TD_Scale` | — | Other | Vertex | — |
| 110 | `TD_Veins` | — | Other | Vertex | — |
| 111 | `TD_Exclamation` | — | Other | Vertex | — |
| 112 | `TD_Amazed` | — | Other | Vertex | — |
| 113 | `TD_Sweaty` | — | Other | Vertex | — |
| 114 | `TD_Hate` | — | Other | Vertex | — |
| 115 | `TD_BeanieEye` | — | Other | Vertex | — |
| 116 | `TD_SymbolEye` | — | Other | Vertex | — |
| 117 | `TD_EggEyes` | — | Other | Vertex | — |
| 118 | `TD_EyesClo` | `TD_EyesClo` | Other | Vertex | — |
| 119 | `ピストン` | — | System | Bone | — |
| 120 | `エンジン` | — | System | Bone | — |
| 121 | `Tail ON` | — | Other | Group | — |

<a id="model-32"></a>
### 32. New MMD Model

- Format: PMX
- Asset path: `nte/chars/Zero (Male)/Zero_夏日澄空/Zero.pmx`
- Embedded name: `MZero_Swimsuit`
- Embedded English name: `New MMD Model`
- Cache file: `6b578e583a499eaab0f242b4af571367f802804e9b65e8979ae7ba2edbf46595.asset`
- Morph counts: Eye: 46, Eyebrow: 13, Lip: 29, Other: 62; total: 150.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `look_U` | `look_U` | Eye | Vertex | — |
| 1 | `look_RU` | `look_RU` | Eye | Vertex | — |
| 2 | `look_R` | `look_R` | Eye | Vertex | — |
| 3 | `look_RD` | `look_RD` | Eye | Vertex | — |
| 4 | `look_D` | `look_D` | Eye | Vertex | — |
| 5 | `look_LD` | `look_LD` | Eye | Vertex | — |
| 6 | `look_L` | `look_L` | Eye | Vertex | — |
| 7 | `look_LU` | `look_LU` | Eye | Vertex | — |
| 8 | `ウィンク` | `EL_Happy_r_CLO` | Eye | Vertex | — |
| 9 | `ウィンク右` | `EL_Happy_l_CLO` | Eye | Vertex | — |
| 10 | `瞳小` | `eye_SF` | Eye | Vertex | — |
| 11 | `びっくり` | `EL_Surprised_01` | Eye | Vertex | surprised |
| 12 | `笑い` | `EL_Smile_01_CLO` | Eye | Vertex | smileEyes |
| 13 | `EL_Angry_01_OP` | `EL_Angry_01_OP` | Eye | Vertex | — |
| 14 | `EL_Angry_01_CLO` | `EL_Angry_01_CLO` | Eye | Vertex | — |
| 15 | `EL_Sad_01_OP` | `EL_Sad_01_OP` | Eye | Vertex | — |
| 16 | `EL_Sad_01_CLO` | `EL_Sad_01_CLO` | Eye | Vertex | — |
| 17 | `EL_Despise_01_OP` | `EL_Despise_01_OP` | Eye | Vertex | — |
| 18 | `EL_Despise_01_CLO` | `EL_Despise_01_CLO` | Eye | Vertex | — |
| 19 | `EL_Doubt_01_OP` | `EL_Doubt_01_OP` | Eye | Vertex | — |
| 20 | `EL_Doubt_01_CLO` | `EL_Doubt_01_CLO` | Eye | Vertex | — |
| 21 | `EL_Evil_01_OP` | `EL_Evil_01_OP` | Eye | Vertex | — |
| 22 | `EL_Evil_01_CLO` | `EL_Evil_01_CLO` | Eye | Vertex | — |
| 23 | `じと目` | `EL_Tired_01_OP` | Eye | Vertex | — |
| 24 | `EL_Tired_01_CLO` | `EL_Tired_01_CLO` | Eye | Vertex | — |
| 25 | `EL_Serious_01_OP` | `EL_Serious_01_OP` | Eye | Vertex | — |
| 26 | `EL_Serious_01_CLO` | `EL_Serious_01_CLO` | Eye | Vertex | — |
| 27 | `EL_Thinking_01_OP` | `EL_Thinking_01_OP` | Eye | Vertex | — |
| 28 | `EL_Thinking_01_CLO` | `EL_Thinking_01_CLO` | Eye | Vertex | — |
| 29 | `ｳｨﾝｸ２右` | `biyan_R` | Eye | Vertex | — |
| 30 | `ウィンク２` | `biyan_L` | Eye | Vertex | — |
| 31 | `まばたき` | `biyan` | Eye | Vertex | blink |
| 32 | `biyan1` | `biyan1` | Eye | Vertex | — |
| 33 | `EL_Up` | `EL_Up` | Eye | Vertex | — |
| 34 | `EL_Down` | `EL_Down` | Eye | Vertex | — |
| 35 | `EL_CornerDown` | `EL_CornerDown` | Eye | Vertex | — |
| 36 | `EL_CornerUp` | `EL_CornerUp` | Eye | Vertex | — |
| 37 | `EL_Light_Up` | `EL_Light_Up` | Eye | Vertex | — |
| 38 | `EL_Light_L` | `EL_Light_L` | Eye | Vertex | — |
| 39 | `EB_happy_01` | `EB_happy_01` | Eye | Vertex | — |
| 40 | `EB_Surprised_01` | `EB_Surprised_01` | Eye | Vertex | — |
| 41 | `にこり` | `EB_Smile_01` | Eyebrow | Vertex | — |
| 42 | `怒り` | `EB_Angry_01` | Eyebrow | Vertex | angry |
| 43 | `困る` | `EB_Sad_01` | Eyebrow | Vertex | sad |
| 44 | `EB_Despise_01` | `EB_Despise_01` | Eyebrow | Vertex | — |
| 45 | `EB_Doubt_01` | `EB_Doubt_01` | Eyebrow | Vertex | — |
| 46 | `EB_Evil_01` | `EB_Evil_01` | Eyebrow | Vertex | — |
| 47 | `EB_Tired_01` | `EB_Tired_01` | Eyebrow | Vertex | — |
| 48 | `真面目` | `EB_Serious_01` | Eyebrow | Vertex | — |
| 49 | `下` | `EB_Thinking_01` | Eyebrow | Vertex | — |
| 50 | `上右` | `EB_UD_R` | Eyebrow | Vertex | — |
| 51 | `上左` | `EB_UD_L` | Eyebrow | Vertex | — |
| 52 | `EB_Rotate_01` | `EB_Rotate_01` | Eyebrow | Vertex | — |
| 53 | `EB_Rotate_02` | `EB_Rotate_02` | Eyebrow | Vertex | — |
| 54 | `mouthPucker` | `mouthPucker` | Lip | Vertex | — |
| 55 | `mouthFunnel` | `mouthFunnel` | Lip | Vertex | — |
| 56 | `mouthRollUpper` | `mouthRollUpper` | Lip | Vertex | — |
| 57 | `mouthRollLower` | `mouthRollLower` | Lip | Vertex | — |
| 58 | `jawOpen` | `jawOpen` | Lip | Vertex | — |
| 59 | `あ` | `jawOpen_a` | Lip | Vertex | a |
| 60 | `い` | `jawOpen_yi` | Lip | Vertex | i |
| 61 | `う` | `jawOpen_wu` | Lip | Vertex | u |
| 62 | `え` | `jawOpen_ei` | Lip | Vertex | e |
| 63 | `お` | `jawOpen_o` | Lip | Vertex | o |
| 64 | `jawOpen_Happy_01_OP` | `jawOpen_Happy_01_OP` | Lip | Vertex | — |
| 65 | `jawOpen_Happy_01_CLO` | `jawOpen_Happy_01_CLO` | Lip | Vertex | — |
| 66 | `jawOpen_Surprised_01_OP` | `jawOpen_Surprised_01_OP` | Lip | Vertex | — |
| 67 | `jawOpen_Surprised_01_CLO` | `jawOpen_Surprised_01_CLO` | Lip | Vertex | — |
| 68 | `jawOpen_Angry_01_OP` | `jawOpen_Angry_01_OP` | Lip | Vertex | — |
| 69 | `jawOpen_Angry_01_CLO` | `jawOpen_Angry_01_CLO` | Lip | Vertex | — |
| 70 | `jawOpen_Smile_01_OP` | `jawOpen_Smile_01_OP` | Lip | Vertex | smile |
| 71 | `jawOpen_Smile_01_CLO` | `jawOpen_Smile_01_CLO` | Lip | Vertex | — |
| 72 | `jawOpen_Sad_01_OP` | `jawOpen_Sad_01_OP` | Lip | Vertex | — |
| 73 | `jawOpen_Sad_01_CLO` | `jawOpen_Sad_01_CLO` | Lip | Vertex | — |
| 74 | `jawOpen_Despise_01_OP` | `jawOpen_Despise_01_OP` | Lip | Vertex | — |
| 75 | `jawOpen_Despise_01_CLO` | `jawOpen_Despise_01_CLO` | Lip | Vertex | — |
| 76 | `jawOpen_Doubt_01_OP` | `jawOpen_Doubt_01_OP` | Lip | Vertex | — |
| 77 | `jawOpen_Doubt_01_CLO` | `jawOpen_Doubt_01_CLO` | Lip | Vertex | — |
| 78 | `にやり２` | `jawOpen_Evil_01_OP` | Lip | Vertex | — |
| 79 | `jawOpen_Evil_01_CLO` | `jawOpen_Evil_01_CLO` | Lip | Vertex | — |
| 80 | `jawOpen_Tired_01_OP` | `jawOpen_Tired_01_OP` | Lip | Vertex | — |
| 81 | `jawOpen_Tired_01_CLO` | `jawOpen_Tired_01_CLO` | Lip | Vertex | — |
| 82 | `TD_EyesClo` | `TD_EyesClo` | Eye | Vertex | — |
| 83 | `EB_Kuxiao_01` | `EB_Kuxiao_01` | Other | Vertex | — |
| 84 | `EL_Kuxiao_01_OP` | `EL_Kuxiao_01_OP` | Other | Vertex | — |
| 85 | `EL_Kuxiao_01_CLO` | `EL_Kuxiao_01_CLO` | Other | Vertex | — |
| 86 | `jawOpen_Kuxiao_01_CLO` | `jawOpen_Kuxiao_01_CLO` | Other | Vertex | — |
| 87 | `EB_Gentle_01` | `EB_Gentle_01` | Other | Vertex | — |
| 88 | `EL_Gentle_01_OP` | `EL_Gentle_01_OP` | Other | Vertex | — |
| 89 | `EL_Gentle_01_CLO` | `EL_Gentle_01_CLO` | Other | Vertex | — |
| 90 | `jawOpen_Gentle_01_CLO` | `jawOpen_Gentle_01_CLO` | Other | Vertex | — |
| 91 | `EB_Zhoumei_01` | `EB_Zhoumei_01` | Other | Vertex | — |
| 92 | `EL_Zhoumei_01_OP` | `EL_Zhoumei_01_OP` | Other | Vertex | — |
| 93 | `EL_Zhoumei_01_CLO` | `EL_Zhoumei_01_CLO` | Other | Vertex | — |
| 94 | `jawOpen_Zhoumei_01_CLO` | `jawOpen_Zhoumei_01_CLO` | Other | Vertex | — |
| 95 | `EB_Zhenjing_01` | `EB_Zhenjing_01` | Other | Vertex | — |
| 96 | `EL_Zhenjing_01_OP` | `EL_Zhenjing_01_OP` | Other | Vertex | — |
| 97 | `EL_Zhenjing_01_CLO` | `EL_Zhenjing_01_CLO` | Other | Vertex | — |
| 98 | `jawOpen_Zhenjing_01_OP` | `jawOpen_Zhenjing_01_OP` | Lip | Vertex | — |
| 99 | `TD_Scale` | `TD_Scale` | Other | Vertex | — |
| 100 | `TD_Veins` | `TD_Veins` | Other | Vertex | — |
| 101 | `TD_Exclamation` | `TD_Exclamation` | Other | Vertex | — |
| 102 | `TD_Amazed` | `TD_Amazed` | Other | Vertex | — |
| 103 | `TD_Sweaty` | `TD_Sweaty` | Other | Vertex | — |
| 104 | `TD_Hate` | `TD_Hate` | Other | Vertex | — |
| 105 | `TD_BeanieEye` | `TD_BeanieEye` | Eye | Vertex | — |
| 106 | `TD_SymbolEye` | `TD_SymbolEye` | Eye | Vertex | — |
| 107 | `TD_EggEyes` | `TD_EggEyes` | Eye | Vertex | — |
| 108 | `TD_Speechless` | `TD_Speechless` | Other | Vertex | — |
| 109 | `TDS_Scale` | `TDS_Scale` | Other | Vertex | — |
| 110 | `TDS_Scale_02` | `TDS_Scale_02` | Other | Vertex | — |
| 111 | `TDS_Scale_03` | `TDS_Scale_03` | Other | Vertex | — |
| 112 | `TDS_Scale_04` | `TDS_Scale_04` | Other | Vertex | — |
| 113 | `TDS_Scale_05` | `TDS_Scale_05` | Other | Vertex | — |
| 114 | `TDS_Scale_06` | `TDS_Scale_06` | Other | Vertex | — |
| 115 | `TDS_Scale_07` | `TDS_Scale_07` | Other | Vertex | — |
| 116 | `TDS_yunxuan_01` | `TDS_yunxuan_01` | Other | Vertex | — |
| 117 | `TDS_xianquan_01` | `TDS_xianquan_01` | Other | Vertex | — |
| 118 | `TDS_StarEyes` | `TDS_StarEyes` | Eye | Vertex | — |
| 119 | `TDS_liuhan` | `TDS_liuhan` | Other | Vertex | — |
| 120 | `TDS_heixian` | `TDS_heixian` | Other | Vertex | — |
| 121 | `TDS_Doubt` | `TDS_Doubt` | Other | Vertex | — |
| 122 | `TDS_lianhong` | `TDS_lianhong` | Other | Vertex | — |
| 123 | `TDS_haixiu` | `TDS_haixiu` | Other | Vertex | — |
| 124 | `TDS_Flower` | `TDS_Flower` | Other | Vertex | — |
| 125 | `TDS_Thorny` | `TDS_Thorny` | Other | Vertex | — |
| 126 | `TDS_Angry_01` | `TDS_Angry_01` | Other | Vertex | — |
| 127 | `TDS_Angry_02` | `TDS_Angry_02` | Other | Vertex | — |
| 128 | `TDS_Angry_03` | `TDS_Angry_03` | Other | Vertex | — |
| 129 | `TDS_Angry_04` | `TDS_Angry_04` | Other | Vertex | — |
| 130 | `TDS_Angry_05` | `TDS_Angry_05` | Other | Vertex | — |
| 131 | `TDS_tanqi_01` | `TDS_tanqi_01` | Other | Vertex | — |
| 132 | `TDS_tanqi_02` | `TDS_tanqi_02` | Other | Vertex | — |
| 133 | `TDS_tanqi_03` | `TDS_tanqi_03` | Other | Vertex | — |
| 134 | `TDS_tanqi_04` | `TDS_tanqi_04` | Other | Vertex | — |
| 135 | `TDS_shengluehao_01` | `TDS_shengluehao_01` | Other | Vertex | — |
| 136 | `TDS_shengluehao_02` | `TDS_shengluehao_02` | Other | Vertex | — |
| 137 | `TDS_shengluehao_03` | `TDS_shengluehao_03` | Other | Vertex | — |
| 138 | `TDS_shengluehao_04` | `TDS_shengluehao_04` | Other | Vertex | — |
| 139 | `TDS_yankuanglei_01` | `TDS_yankuanglei_01` | Other | Vertex | — |
| 140 | `TDS_gandonglei_01` | `TDS_gandonglei_01` | Other | Vertex | — |
| 141 | `TDS_liulei_01` | `TDS_liulei_01` | Other | Vertex | — |
| 142 | `TDS_liulei_02` | `TDS_liulei_02` | Other | Vertex | — |
| 143 | `TDS_liulei_03` | `TDS_liulei_03` | Other | Vertex | — |
| 144 | `TDS_liulei_04` | `TDS_liulei_04` | Other | Vertex | — |
| 145 | `TDS_leizhu_01` | `TDS_leizhu_01` | Other | Vertex | — |
| 146 | `TDS_leizhu_02` | `TDS_leizhu_02` | Other | Vertex | — |
| 147 | `TDS_leizhu_03` | `TDS_leizhu_03` | Other | Vertex | — |
| 148 | `TDS_leizhu_04` | `TDS_leizhu_04` | Other | Vertex | — |
| 149 | `TDS_leizhu_05` | `TDS_leizhu_05` | Other | Vertex | — |

<a id="model-33"></a>
### 33. Nicole

- Format: PMX
- Asset path: —
- Embedded name: `Nicole`
- Embedded English name: `Nicole`
- Cache file: `e3dfb2fad737030a16ce283613591395eb698a75b900bded5402917ec857e7fc.asset`
- Morph counts: Eye: 18, Eyebrow: 22, Lip: 24; total: 64.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `あ` | `Mouth_A01` | Lip | Vertex | a |
| 1 | `い` | `Mouth_Open01` | Lip | Vertex | i |
| 2 | `う` | `Mouth_Open01` | Lip | Vertex | u |
| 3 | `え` | `Mouth_Open01` | Lip | Vertex | e |
| 4 | `お` | `Mouth_Open01` | Lip | Vertex | o |
| 5 | `ワ` | `Mouth_Smile02` | Lip | Vertex | — |
| 6 | `ん` | `Mouth_Angry01` | Lip | Vertex | — |
| 7 | `い１` | `Mouth_Angry02` | Lip | Vertex | — |
| 8 | `い２` | `Mouth_Angry03` | Lip | Vertex | — |
| 9 | `あ２` | `Mouth_Fury01` | Lip | Vertex | — |
| 10 | `にやり` | `Mouth_Smile01` | Lip | Vertex | smile |
| 11 | `にやり２` | `Mouth_Doya01` | Lip | Vertex | — |
| 12 | `にやり３` | `Mouth_Doya02` | Lip | Vertex | — |
| 13 | `ω` | `Mouth_Neko01` | Lip | Vertex | — |
| 14 | `てへぺろ` | `Mouth_Pero01` | Lip | Vertex | — |
| 15 | `ぺろっ` | `Mouth_Pero02` | Lip | Vertex | — |
| 16 | `口角上げ` | `Mouth_Default` | Lip | Vertex | — |
| 17 | `口角下げ` | `Mouth_Default` | Lip | Vertex | — |
| 18 | `口横広げ` | `Mouth_Line01` | Lip | Vertex | — |
| 19 | `口横狭め` | `Mouth_Line02` | Lip | Vertex | — |
| 20 | `舌広げ` | `Mouth_BigTongue01` | Lip | Vertex | — |
| 21 | `∨` | `Mouth_Smile03` | Lip | Vertex | — |
| 22 | `∧` | `Mouth_Angry04` | Lip | Vertex | — |
| 23 | `M` | `Mouth_Wave` | Lip | Vertex | — |
| 24 | `まばたき` | `Eye_WinkB_L` | Eye | Vertex | blink |
| 25 | `笑い` | `Eye_WinkA_L` | Eye | Vertex | smileEyes |
| 26 | `ウィンク` | `Eye_WinkA_L` | Eye | Vertex | — |
| 27 | `ウィンク右` | `Eye_WinkA_R` | Eye | Vertex | — |
| 28 | `ウィンク２` | `Eye_WinkB_L` | Eye | Vertex | — |
| 29 | `ウィンク２右` | `Eye_WinkB_R` | Eye | Vertex | — |
| 30 | `なごみ` | `Eye_WinkC_L` | Eye | Vertex | — |
| 31 | `なごみ左` | `Eye_WinkC_L` | Eye | Vertex | — |
| 32 | `なごみ右` | `Eye_WinkC_R` | Eye | Vertex | — |
| 33 | `びっくり` | `Eye_Ha` | Eye | Vertex | surprised |
| 34 | `じと目` | `Eye_Jito` | Eye | Vertex | — |
| 35 | `悲しむ` | `Eye_Wail` | Eye | Vertex | — |
| 36 | `怒り目` | `Eye_Hostility` | Eye | Vertex | — |
| 37 | `ジト目` | `Eye_Tired` | Eye | Vertex | — |
| 38 | `眼角上` | `Eye_WUp` | Eye | Vertex | — |
| 39 | `眼角下` | `Eye_WDown` | Eye | Vertex | — |
| 40 | `下眼上` | `Eye_Lowereyelid` | Eye | Vertex | — |
| 41 | `睫上` | `Eye_LashesUP` | Eye | Vertex | — |
| 42 | `真面目` | `Brow_Trouble_L` | Eyebrow | Vertex | — |
| 43 | `困る` | `Brow_Trouble_L` | Eyebrow | Vertex | sad |
| 44 | `にこり` | `Brow_Smily_L` | Eyebrow | Vertex | — |
| 45 | `怒り` | `Brow_Angry_L` | Eyebrow | Vertex | angry |
| 46 | `恥ずかしい` | `Brow_Shy_L` | Eyebrow | Vertex | — |
| 47 | `上` | `Brow_Up_L` | Eyebrow | Vertex | — |
| 48 | `下` | `Brow_Down_L` | Eyebrow | Vertex | — |
| 49 | `前` | `Brow_Squeeze_L` | Eyebrow | Vertex | — |
| 50 | `困る左` | `Brow_Trouble_L` | Eyebrow | Vertex | — |
| 51 | `困る右` | `Brow_Trouble_R` | Eyebrow | Vertex | — |
| 52 | `にこり左` | `Brow_Smily_L` | Eyebrow | Vertex | — |
| 53 | `にこり右` | `Brow_Smily_R` | Eyebrow | Vertex | — |
| 54 | `怒り左` | `Brow_Angry_L` | Eyebrow | Vertex | — |
| 55 | `怒り右` | `Brow_Angry_R` | Eyebrow | Vertex | — |
| 56 | `恥ずかしい左` | `Brow_Shy_L` | Eyebrow | Vertex | — |
| 57 | `恥ずかしい右` | `Brow_Shy_R` | Eyebrow | Vertex | — |
| 58 | `上左` | `Brow_Up_L` | Eyebrow | Vertex | — |
| 59 | `上右` | `Brow_Up_R` | Eyebrow | Vertex | — |
| 60 | `下左` | `Brow_Down_L` | Eyebrow | Vertex | — |
| 61 | `下右` | `Brow_Down_R` | Eyebrow | Vertex | — |
| 62 | `前左` | `Brow_Squeeze_L` | Eyebrow | Vertex | — |
| 63 | `前右` | `Brow_Squeeze_R` | Eyebrow | Vertex | — |

<a id="model-34"></a>
### 34. Nicole

- Format: PMX
- Asset path: `zzz/chars/Nicole/Nicole Skin/妮可.pmx`
- Embedded name: `Nicole`
- Embedded English name: `Nicole`
- Cache file: `9e47d34fe879793f88bb5ab65ff76d8d17cd2f2677b9787b44cf7a2085580016.asset`
- Morph counts: Eye: 15, Eyebrow: 6, Lip: 21; total: 42.
- Unmatched app channels: `smile`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `まばたき` | `Eye_Close_NuoCha` | Eye | Vertex | blink |
| 1 | `ウィンク２` | `Eye_Close_NuoCha` | Eye | Vertex | — |
| 2 | `ウィンク２右` | `Eye_Close_NuoCha` | Eye | Vertex | — |
| 3 | `笑い` | `EYE_Wink_L_NuoCha` | Eye | Vertex | smileEyes |
| 4 | `ウィンク` | `EYE_Wink_L_NuoCha` | Eye | Vertex | — |
| 5 | `ウィンク右` | `EYE_Wink_R_NuoCha` | Eye | Vertex | — |
| 6 | `じと目` | `Eye_半闭_NuoCha` | Eye | Vertex | — |
| 7 | `怒り目` | `Eye_认真_NuoCha` | Eye | Vertex | — |
| 8 | `悲しむ` | `Eye_困扰_NuoCha` | Eye | Vertex | — |
| 9 | `びっくり` | `Eye_Open_R_NuoCha` | Eye | Vertex | surprised |
| 10 | `びっくり２` | `Eye_Angry_NuoCha` | Eye | Vertex | — |
| 11 | `びっくり右` | `Eye_Open_R_NuoCha` | Eye | Vertex | — |
| 12 | `びっくり左` | `Eye_Open_L_NuoCha` | Eye | Vertex | — |
| 13 | `眼角下` | `Eye_↙↘_NuoCha` | Eye | Vertex | — |
| 14 | `下眼上` | `Eye_下眼睑↑_NuoCha` | Eye | Vertex | — |
| 15 | `あ` | `Mouth_AaTalk_NuoCha` | Lip | Vertex | a |
| 16 | `い` | `Mouth_Ii_NuoCha` | Lip | Vertex | i |
| 17 | `う` | `Mouth_Uu_NuoCha` | Lip | Vertex | u |
| 18 | `え` | `Mouth_Uu_NuoCha` | Lip | Vertex | e |
| 19 | `お` | `Mouth_UuOo_NuoCha` | Lip | Vertex | o |
| 20 | `お２` | `Mouth_Oo_NuoCha` | Lip | Vertex | — |
| 21 | `い２` | `Mouth_Laugh2_NuoCha` | Lip | Vertex | — |
| 22 | `ワ` | `Mouth_Laugh_NuoCha` | Lip | Vertex | — |
| 23 | `え２` | `Mouth_Ee_NuoCha` | Lip | Vertex | — |
| 24 | `ああ` | `Mouth_Aa3Shout_NuoCha` | Lip | Vertex | — |
| 25 | `□` | `Mouth_Aa2_NuoCha` | Lip | Vertex | — |
| 26 | `ワ２` | `Mouth_Aa1_NuoCha` | Lip | Vertex | — |
| 27 | `口角上げ` | `Mouth_oo↗_NuoCha` | Lip | Vertex | — |
| 28 | `口角下げ` | `Mouth_oo↘_NuoCha` | Lip | Vertex | — |
| 29 | `口横狭め` | `Mouth_oo←_NuoCha` | Lip | Vertex | — |
| 30 | `口横広げ` | `Mouth_oo→_NuoCha` | Lip | Vertex | — |
| 31 | `口上` | `Mouth_↑_NuoCha` | Lip | Vertex | — |
| 32 | `口下` | `Mouth_↓_NuoCha` | Lip | Vertex | — |
| 33 | `口左` | `Mouth_→_NuoCha` | Lip | Vertex | — |
| 34 | `口右` | `Mouth_←_NuoCha` | Lip | Vertex | — |
| 35 | `▲` | `Mouth_△_NuoCha` | Lip | Vertex | — |
| 36 | `真面目` | `EB_困扰_NuoCha` | Eyebrow | Vertex | — |
| 37 | `困る` | `EB_困扰_NuoCha` | Eyebrow | Vertex | sad |
| 38 | `にこり` | `EB_Relax_NuoCha` | Eyebrow | Vertex | — |
| 39 | `怒り` | `EB_Angry_NuoCha` | Eyebrow | Vertex | angry |
| 40 | `下` | `EB_↓_NuoCha` | Eyebrow | Vertex | — |
| 41 | `上` | `EB_↑_NuoCha` | Eyebrow | Vertex | — |

<a id="model-35"></a>
### 35. Norano_WhiteHeart

- Format: PMX
- Asset path: —
- Embedded name: `Norano_WhiteHeart`
- Embedded English name: `Norano_WhiteHeart`
- Cache file: `a1108b3d0107b097b731511563fa4f14e0f7de4d50faa9552fb9ee51c24e815e.asset`
- Morph counts: Eye: 15, Eyebrow: 17, Lip: 25, Other: 2; total: 59.
- Unmatched app channels: `smile`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `まばたき` | `Fac_Eye_Close` | Eye | Vertex | blink |
| 1 | `笑い` | `Fac_Eye_Smile` | Eye | Vertex | smileEyes |
| 2 | `ウィンク` | `Fac_Eye_L_Wink` | Eye | Vertex | — |
| 3 | `ウィンク右` | `Fac_Eye_R_Wink` | Eye | Vertex | — |
| 4 | `ウィンク２` | `Fac_Eye_L_Close` | Eye | Vertex | — |
| 5 | `ウィンク２右` | `Fac_Eye_R_Close` | Eye | Vertex | — |
| 6 | `びっくり` | `Fac_Eye_Open` | Eye | Vertex | surprised |
| 7 | `びっくり左` | `Fac_Eye_L_Open` | Eye | Vertex | — |
| 8 | `びっくり右` | `Fac_Eye_R_Open` | Eye | Vertex | — |
| 9 | `じと目` | `Fac_Eye_HalfClose` | Eye | Vertex | — |
| 10 | `怒り目２` | `Fac_Eye_MidDown` | Eye | Vertex | — |
| 11 | `怒り目` | `Fac_Eye_Angry` | Eye | Vertex | — |
| 12 | `悲しむ` | `Fac_Eye_Sad` | Eye | Vertex | — |
| 13 | `眼角下` | `Fac_Eye_MidUp` | Eye | Vertex | — |
| 14 | `下眼上` | `Fac_Eye_LowlidUp` | Eye | Vertex | — |
| 15 | `あ` | `Fac_Mth_Aa` | Lip | Vertex | a |
| 16 | `い` | `Fac_Mth_Ii` | Lip | Vertex | i |
| 17 | `う` | `Fac_Mth_Uu` | Lip | Vertex | u |
| 18 | `え` | `Fac_Mth_Ee` | Lip | Vertex | e |
| 19 | `お` | `Fac_Mth_Oo` | Lip | Vertex | o |
| 20 | `ワ` | `Fac_Mth_AaTalk` | Lip | Vertex | — |
| 21 | `あ１` | `Fac_Mth_Aa1` | Lip | Vertex | — |
| 22 | `う２` | `Fac_Mth_UuOo` | Lip | Vertex | — |
| 23 | `笑う１` | `Fac_Mth_Laugh1` | Lip | Vertex | — |
| 24 | `口角上げ` | `Fac_Mth_LR_Up` | Lip | Vertex | — |
| 25 | `口角上げ左` | `Fac_Mth_L_Up` | Lip | Vertex | — |
| 26 | `口角上げ右` | `Fac_Mth_R_Up` | Lip | Vertex | — |
| 27 | `口角下げ` | `Fac_Mth_LR_Down` | Lip | Vertex | — |
| 28 | `口角下げ左` | `Fac_Mth_L_Down` | Lip | Vertex | — |
| 29 | `口角下げ右` | `Fac_Mth_R_Down` | Lip | Vertex | — |
| 30 | `口横狭め` | `Fac_Mth_In` | Lip | Vertex | — |
| 31 | `口横狭め左` | `Fac_Mth_L_In` | Lip | Vertex | — |
| 32 | `口横狭め右` | `Fac_Mth_R_In` | Lip | Vertex | — |
| 33 | `口横広げ` | `Fac_Mth_Out` | Lip | Vertex | — |
| 34 | `口横広げ左` | `Fac_Mth_L_Out` | Lip | Vertex | — |
| 35 | `口横広げ右` | `Fac_Mth_R_Out` | Lip | Vertex | — |
| 36 | `口上` | `Fac_Mth_Up` | Lip | Vertex | — |
| 37 | `口下` | `Fac_Mth_Down` | Lip | Vertex | — |
| 38 | `口左` | `Fac_Mth_Left` | Lip | Vertex | — |
| 39 | `口右` | `Fac_Mth_Right` | Lip | Vertex | — |
| 40 | `真面目` | `Fac_Ebr_Serious` | Eyebrow | Vertex | — |
| 41 | `困る` | `Fac_Ebr_Sorrow` | Eyebrow | Vertex | sad |
| 42 | `八` | `Fac_Ebr_Sad` | Eyebrow | Vertex | — |
| 43 | `八左` | `Fac_Ebr_L_Sad` | Eyebrow | Vertex | — |
| 44 | `八右` | `Fac_Ebr_R_Sad` | Eyebrow | Vertex | — |
| 45 | `怒り` | `Fac_Ebr_Angry` | Eyebrow | Vertex | angry |
| 46 | `怒り左` | `Fac_Ebr_L_Angry` | Eyebrow | Vertex | — |
| 47 | `怒り右` | `Fac_Ebr_R_Angry` | Eyebrow | Vertex | — |
| 48 | `にこり` | `Fac_Ebr_Smile` | Eyebrow | Vertex | — |
| 49 | `リラックス左` | `Fac_Ebr_L_Relax` | Eyebrow | Vertex | — |
| 50 | `リラックス右` | `Fac_Ebr_R_Relax` | Eyebrow | Vertex | — |
| 51 | `上` | `Fac_Ebr_Up` | Eyebrow | Vertex | — |
| 52 | `下` | `Fac_Ebr_Down` | Eyebrow | Vertex | — |
| 53 | `下左` | `Fac_Ebr_L_Down` | Eyebrow | Vertex | — |
| 54 | `下右` | `Fac_Ebr_R_Down` | Eyebrow | Vertex | — |
| 55 | `上左` | `Fac_Ebr_L_Up` | Eyebrow | Vertex | — |
| 56 | `上右` | `Fac_Ebr_R_Up` | Eyebrow | Vertex | — |
| 57 | `上歯` | `Fac_Tooth_Up` | Other | Vertex | — |
| 58 | `下歯` | `Fac_Tooth_Down` | Other | Vertex | — |

<a id="model-36"></a>
### 36. NPC_BelleChild_Model

- Format: PMX
- Asset path: —
- Embedded name: `NPC_BelleChild_Model`
- Embedded English name: `NPC_BelleChild_Model`
- Cache file: `d662baca3cdb58397e273db77bd660bd85819009899e22c5a82ba86bd5e0f1c8.asset`
- Morph counts: Other: 33; total: 33.
- Unmatched app channels: `a`, `i`, `u`, `e`, `o`, `blink`, `smileEyes`, `smile`, `sad`, `angry`, `surprised`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `0005_BelleChild_Eyebrow_LOD0_morph0` | `0005_BelleChild_Eyebrow_LOD0_morph0` | Other | Vertex | — |
| 1 | `0005_BelleChild_Eyebrow_LOD0_morph1` | `0005_BelleChild_Eyebrow_LOD0_morph1` | Other | Vertex | — |
| 2 | `0005_BelleChild_Eyebrow_LOD0_morph2` | `0005_BelleChild_Eyebrow_LOD0_morph2` | Other | Vertex | — |
| 3 | `0005_BelleChild_Eyebrow_LOD0_morph3` | `0005_BelleChild_Eyebrow_LOD0_morph3` | Other | Vertex | — |
| 4 | `0005_BelleChild_Eyebrow_LOD0_morph4` | `0005_BelleChild_Eyebrow_LOD0_morph4` | Other | Vertex | — |
| 5 | `0005_BelleChild_Eyebrow_LOD0_morph5` | `0005_BelleChild_Eyebrow_LOD0_morph5` | Other | Vertex | — |
| 6 | `0006_BelleChild_Face_LOD0_morph0` | `0006_BelleChild_Face_LOD0_morph0` | Other | Vertex | — |
| 7 | `0006_BelleChild_Face_LOD0_morph1` | `0006_BelleChild_Face_LOD0_morph1` | Other | Vertex | — |
| 8 | `0006_BelleChild_Face_LOD0_morph2` | `0006_BelleChild_Face_LOD0_morph2` | Other | Vertex | — |
| 9 | `0006_BelleChild_Face_LOD0_morph3` | `0006_BelleChild_Face_LOD0_morph3` | Other | Vertex | — |
| 10 | `0006_BelleChild_Face_LOD0_morph4` | `0006_BelleChild_Face_LOD0_morph4` | Other | Vertex | — |
| 11 | `0006_BelleChild_Face_LOD0_morph5` | `0006_BelleChild_Face_LOD0_morph5` | Other | Vertex | — |
| 12 | `0006_BelleChild_Face_LOD0_morph6` | `0006_BelleChild_Face_LOD0_morph6` | Other | Vertex | — |
| 13 | `0006_BelleChild_Face_LOD0_morph7` | `0006_BelleChild_Face_LOD0_morph7` | Other | Vertex | — |
| 14 | `0006_BelleChild_Face_LOD0_morph8` | `0006_BelleChild_Face_LOD0_morph8` | Other | Vertex | — |
| 15 | `0006_BelleChild_Face_LOD0_morph9` | `0006_BelleChild_Face_LOD0_morph9` | Other | Vertex | — |
| 16 | `0006_BelleChild_Face_LOD0_morph10` | `0006_BelleChild_Face_LOD0_morph10` | Other | Vertex | — |
| 17 | `0006_BelleChild_Face_LOD0_morph11` | `0006_BelleChild_Face_LOD0_morph11` | Other | Vertex | — |
| 18 | `0006_BelleChild_Face_LOD0_morph12` | `0006_BelleChild_Face_LOD0_morph12` | Other | Vertex | — |
| 19 | `0006_BelleChild_Face_LOD0_morph13` | `0006_BelleChild_Face_LOD0_morph13` | Other | Vertex | — |
| 20 | `0006_BelleChild_Face_LOD0_morph14` | `0006_BelleChild_Face_LOD0_morph14` | Other | Vertex | — |
| 21 | `0006_BelleChild_Face_LOD0_morph15` | `0006_BelleChild_Face_LOD0_morph15` | Other | Vertex | — |
| 22 | `0006_BelleChild_Face_LOD0_morph16` | `0006_BelleChild_Face_LOD0_morph16` | Other | Vertex | — |
| 23 | `0006_BelleChild_Face_LOD0_morph17` | `0006_BelleChild_Face_LOD0_morph17` | Other | Vertex | — |
| 24 | `0006_BelleChild_Face_LOD0_morph18` | `0006_BelleChild_Face_LOD0_morph18` | Other | Vertex | — |
| 25 | `0006_BelleChild_Face_LOD0_morph19` | `0006_BelleChild_Face_LOD0_morph19` | Other | Vertex | — |
| 26 | `0006_BelleChild_Face_LOD0_morph20` | `0006_BelleChild_Face_LOD0_morph20` | Other | Vertex | — |
| 27 | `0006_BelleChild_Face_LOD0_morph21` | `0006_BelleChild_Face_LOD0_morph21` | Other | Vertex | — |
| 28 | `0006_BelleChild_Face_LOD0_morph22` | `0006_BelleChild_Face_LOD0_morph22` | Other | Vertex | — |
| 29 | `0006_BelleChild_Face_LOD0_morph23` | `0006_BelleChild_Face_LOD0_morph23` | Other | Vertex | — |
| 30 | `0006_BelleChild_Face_LOD0_morph24` | `0006_BelleChild_Face_LOD0_morph24` | Other | Vertex | — |
| 31 | `0006_BelleChild_Face_LOD0_morph25` | `0006_BelleChild_Face_LOD0_morph25` | Other | Vertex | — |
| 32 | `0006_BelleChild_Face_LOD0_morph26` | `0006_BelleChild_Face_LOD0_morph26` | Other | Vertex | — |

<a id="model-37"></a>
### 37. NPC_WiseChild_Model

- Format: PMX
- Asset path: —
- Embedded name: `NPC_WiseChild_Model`
- Embedded English name: `NPC_WiseChild_Model`
- Cache file: `4afb6dcdd8cddd5a9b788f29d0c0cb2fb70456f45500c11a5f5b0366b45a94de.asset`
- Morph counts: Other: 33; total: 33.
- Unmatched app channels: `a`, `i`, `u`, `e`, `o`, `blink`, `smileEyes`, `smile`, `sad`, `angry`, `surprised`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `0005_WiseChild_Eyebrow_LOD0_morph0` | `0005_WiseChild_Eyebrow_LOD0_morph0` | Other | Vertex | — |
| 1 | `0005_WiseChild_Eyebrow_LOD0_morph1` | `0005_WiseChild_Eyebrow_LOD0_morph1` | Other | Vertex | — |
| 2 | `0005_WiseChild_Eyebrow_LOD0_morph2` | `0005_WiseChild_Eyebrow_LOD0_morph2` | Other | Vertex | — |
| 3 | `0005_WiseChild_Eyebrow_LOD0_morph3` | `0005_WiseChild_Eyebrow_LOD0_morph3` | Other | Vertex | — |
| 4 | `0005_WiseChild_Eyebrow_LOD0_morph4` | `0005_WiseChild_Eyebrow_LOD0_morph4` | Other | Vertex | — |
| 5 | `0005_WiseChild_Eyebrow_LOD0_morph5` | `0005_WiseChild_Eyebrow_LOD0_morph5` | Other | Vertex | — |
| 6 | `0006_WiseChild_Face_LOD0_morph0` | `0006_WiseChild_Face_LOD0_morph0` | Other | Vertex | — |
| 7 | `0006_WiseChild_Face_LOD0_morph1` | `0006_WiseChild_Face_LOD0_morph1` | Other | Vertex | — |
| 8 | `0006_WiseChild_Face_LOD0_morph2` | `0006_WiseChild_Face_LOD0_morph2` | Other | Vertex | — |
| 9 | `0006_WiseChild_Face_LOD0_morph3` | `0006_WiseChild_Face_LOD0_morph3` | Other | Vertex | — |
| 10 | `0006_WiseChild_Face_LOD0_morph4` | `0006_WiseChild_Face_LOD0_morph4` | Other | Vertex | — |
| 11 | `0006_WiseChild_Face_LOD0_morph5` | `0006_WiseChild_Face_LOD0_morph5` | Other | Vertex | — |
| 12 | `0006_WiseChild_Face_LOD0_morph6` | `0006_WiseChild_Face_LOD0_morph6` | Other | Vertex | — |
| 13 | `0006_WiseChild_Face_LOD0_morph7` | `0006_WiseChild_Face_LOD0_morph7` | Other | Vertex | — |
| 14 | `0006_WiseChild_Face_LOD0_morph8` | `0006_WiseChild_Face_LOD0_morph8` | Other | Vertex | — |
| 15 | `0006_WiseChild_Face_LOD0_morph9` | `0006_WiseChild_Face_LOD0_morph9` | Other | Vertex | — |
| 16 | `0006_WiseChild_Face_LOD0_morph10` | `0006_WiseChild_Face_LOD0_morph10` | Other | Vertex | — |
| 17 | `0006_WiseChild_Face_LOD0_morph11` | `0006_WiseChild_Face_LOD0_morph11` | Other | Vertex | — |
| 18 | `0006_WiseChild_Face_LOD0_morph12` | `0006_WiseChild_Face_LOD0_morph12` | Other | Vertex | — |
| 19 | `0006_WiseChild_Face_LOD0_morph13` | `0006_WiseChild_Face_LOD0_morph13` | Other | Vertex | — |
| 20 | `0006_WiseChild_Face_LOD0_morph14` | `0006_WiseChild_Face_LOD0_morph14` | Other | Vertex | — |
| 21 | `0006_WiseChild_Face_LOD0_morph15` | `0006_WiseChild_Face_LOD0_morph15` | Other | Vertex | — |
| 22 | `0006_WiseChild_Face_LOD0_morph16` | `0006_WiseChild_Face_LOD0_morph16` | Other | Vertex | — |
| 23 | `0006_WiseChild_Face_LOD0_morph17` | `0006_WiseChild_Face_LOD0_morph17` | Other | Vertex | — |
| 24 | `0006_WiseChild_Face_LOD0_morph18` | `0006_WiseChild_Face_LOD0_morph18` | Other | Vertex | — |
| 25 | `0006_WiseChild_Face_LOD0_morph19` | `0006_WiseChild_Face_LOD0_morph19` | Other | Vertex | — |
| 26 | `0006_WiseChild_Face_LOD0_morph20` | `0006_WiseChild_Face_LOD0_morph20` | Other | Vertex | — |
| 27 | `0006_WiseChild_Face_LOD0_morph21` | `0006_WiseChild_Face_LOD0_morph21` | Other | Vertex | — |
| 28 | `0006_WiseChild_Face_LOD0_morph22` | `0006_WiseChild_Face_LOD0_morph22` | Other | Vertex | — |
| 29 | `0006_WiseChild_Face_LOD0_morph23` | `0006_WiseChild_Face_LOD0_morph23` | Other | Vertex | — |
| 30 | `0006_WiseChild_Face_LOD0_morph24` | `0006_WiseChild_Face_LOD0_morph24` | Other | Vertex | — |
| 31 | `0006_WiseChild_Face_LOD0_morph25` | `0006_WiseChild_Face_LOD0_morph25` | Other | Vertex | — |
| 32 | `0006_WiseChild_Face_LOD0_morph26` | `0006_WiseChild_Face_LOD0_morph26` | Other | Vertex | — |

<a id="model-38"></a>
### 38. NTE - Zankou - Fashion

- Format: PMX
- Asset path: `nte/chars/Zankou/Zankou_Fashion_MMD/Zankou.pmx`
- Embedded name: `NTE - Zankou - Fashion`
- Embedded English name: `NTE - Zankou - Fashion`
- Cache file: `780392e4551bdcbb27e1ee92278c653892e7ed4efe60cce1af1c26db67dbbd0c.asset`
- Morph counts: Eye: 32, Eyebrow: 15, Lip: 28, Other: 61; total: 136.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `EB_happy_01` | `EB_happy_01` | Eyebrow | Vertex | — |
| 1 | `にこり` | `EB_Surprised_01` | Eyebrow | Vertex | — |
| 2 | `EB_Smile_01` | `EB_Smile_01` | Eyebrow | Vertex | smile |
| 3 | `怒り` | `EB_Angry_01` | Eyebrow | Vertex | angry |
| 4 | `困る` | `EB_Sad_01` | Eyebrow | Vertex | sad |
| 5 | `EB_Despise_01` | `EB_Despise_01` | Eyebrow | Vertex | — |
| 6 | `EB_Doubt_01` | `EB_Doubt_01` | Eyebrow | Vertex | — |
| 7 | `EB_Evil_01` | `EB_Evil_01` | Eyebrow | Vertex | — |
| 8 | `EB_Tired_01` | `EB_Tired_01` | Eyebrow | Vertex | — |
| 9 | `真面目` | `EB_Serious_01` | Eyebrow | Vertex | — |
| 10 | `EB_Thinking_01` | `EB_Thinking_01` | Eyebrow | Vertex | — |
| 11 | `左上` | `EB_UD_L` | Eyebrow | Vertex | — |
| 12 | `右上` | `EB_UD_R` | Eyebrow | Vertex | — |
| 13 | `EB_Rotate_01` | `EB_Rotate_01` | Eyebrow | Vertex | — |
| 14 | `EB_Rotate_02` | `EB_Rotate_02` | Eyebrow | Vertex | — |
| 15 | `look_U` | `look_U` | Eye | Vertex | — |
| 16 | `look_RU` | `look_RU` | Eye | Vertex | — |
| 17 | `look_R` | `look_R` | Eye | Vertex | — |
| 18 | `look_RD` | `look_RD` | Eye | Vertex | — |
| 19 | `look_D` | `look_D` | Eye | Vertex | — |
| 20 | `look_LD` | `look_LD` | Eye | Vertex | — |
| 21 | `look_L` | `look_L` | Eye | Vertex | — |
| 22 | `look_LU` | `look_LU` | Eye | Vertex | — |
| 23 | `ウィンク右` | `EL_Happy_l_CLO` | Eye | Vertex | — |
| 24 | `ウィンク` | `EL_Happy_r_CLO` | Eye | Vertex | — |
| 25 | `瞳小` | `eye_SF` | Eye | Vertex | — |
| 26 | `びっくり` | `EL_Surprised_01` | Eye | Vertex | surprised |
| 27 | `笑い` | `EL_Smile_01_CLO` | Eye | Vertex | smileEyes |
| 28 | `ｷﾘｯ` | `EL_Angry_01_OP` | Eye | Vertex | — |
| 29 | `目を細める` | `EL_Sad_01_OP` | Eye | Vertex | — |
| 30 | `EL_Despise_01_OP` | `EL_Despise_01_OP` | Eye | Vertex | — |
| 31 | `EL_Doubt_01_OP` | `EL_Doubt_01_OP` | Eye | Vertex | — |
| 32 | `EL_Doubt_01_CLO` | `EL_Doubt_01_CLO` | Eye | Vertex | — |
| 33 | `ｷﾘｯ2` | `EL_Evil_01_OP` | Eye | Vertex | — |
| 34 | `じと目` | `EL_Tired_01_OP` | Eye | Vertex | — |
| 35 | `EL_Serious_01_OP` | `EL_Serious_01_OP` | Eye | Vertex | — |
| 36 | `EL_Thinking_01_OP` | `EL_Thinking_01_OP` | Eye | Vertex | — |
| 37 | `ｳｨﾝｸ２右` | `biyan_R` | Eye | Vertex | — |
| 38 | `ウィンク２` | `biyan_L` | Eye | Vertex | — |
| 39 | `まばたき` | `biyan` | Eye | Vertex | blink |
| 40 | `biyan1` | `biyan1` | Eye | Vertex | — |
| 41 | `下眼上` | `EL_Up` | Eye | Vertex | — |
| 42 | `EL_Down` | `EL_Down` | Eye | Vertex | — |
| 43 | `EL_CornerDown` | `EL_CornerDown` | Eye | Vertex | — |
| 44 | `EL_CornerUp` | `EL_CornerUp` | Eye | Vertex | — |
| 45 | `EL_Light_Up` | `EL_Light_Up` | Eye | Vertex | — |
| 46 | `EL_Light_L` | `EL_Light_L` | Eye | Vertex | — |
| 47 | `口横狭げ` | `mouthPucker` | Lip | Vertex | — |
| 48 | `mouthRollUpper` | `mouthRollUpper` | Lip | Vertex | — |
| 49 | `mouthRollLower` | `mouthRollLower` | Lip | Vertex | — |
| 50 | `mouthFunnel` | `mouthFunnel` | Lip | Vertex | — |
| 51 | `あ2` | `jawOpen` | Lip | Vertex | — |
| 52 | `あ` | `jawOpen_a` | Lip | Vertex | a |
| 53 | `い` | `jawOpen_yi` | Lip | Vertex | i |
| 54 | `う` | `jawOpen_wu` | Lip | Vertex | u |
| 55 | `え` | `jawOpen_ei` | Lip | Vertex | e |
| 56 | `お` | `jawOpen_o` | Lip | Vertex | o |
| 57 | `ワ` | `jawOpen_Happy_01_OP` | Lip | Vertex | — |
| 58 | `jawOpen_Happy_01_CLO` | `jawOpen_Happy_01_CLO` | Lip | Vertex | — |
| 59 | `jawOpen_Surprised_01_OP` | `jawOpen_Surprised_01_OP` | Lip | Vertex | — |
| 60 | `jawOpen_Surprised_01_CLO` | `jawOpen_Surprised_01_CLO` | Lip | Vertex | — |
| 61 | `jawOpen_Angry_01_OP` | `jawOpen_Angry_01_OP` | Lip | Vertex | — |
| 62 | `jawOpen_Angry_01_CLO` | `jawOpen_Angry_01_CLO` | Lip | Vertex | — |
| 63 | `jawOpen_Smile_01_OP` | `jawOpen_Smile_01_OP` | Lip | Vertex | — |
| 64 | `jawOpen_Smile_01_CLO` | `jawOpen_Smile_01_CLO` | Lip | Vertex | — |
| 65 | `jawOpen_Sad_01_OP` | `jawOpen_Sad_01_OP` | Lip | Vertex | — |
| 66 | `jawOpen_Sad_01_CLO` | `jawOpen_Sad_01_CLO` | Lip | Vertex | — |
| 67 | `jawOpen_Despise_01_OP` | `jawOpen_Despise_01_OP` | Lip | Vertex | — |
| 68 | `jawOpen_Despise_01_CLO` | `jawOpen_Despise_01_CLO` | Lip | Vertex | — |
| 69 | `jawOpen_Doubt_01_OP` | `jawOpen_Doubt_01_OP` | Lip | Vertex | — |
| 70 | `jawOpen_Doubt_01_CLO` | `jawOpen_Doubt_01_CLO` | Lip | Vertex | — |
| 71 | `jawOpen_Evil_01_OP` | `jawOpen_Evil_01_OP` | Lip | Vertex | — |
| 72 | `jawOpen_Evil_01_CLO` | `jawOpen_Evil_01_CLO` | Lip | Vertex | — |
| 73 | `jawOpen_Tired_01_OP` | `jawOpen_Tired_01_OP` | Lip | Vertex | — |
| 74 | `jawOpen_Tired_01_CLO` | `jawOpen_Tired_01_CLO` | Lip | Vertex | — |
| 75 | `TD_Scale` | `TD_Scale` | Other | Vertex | — |
| 76 | `TD_Veins` | `TD_Veins` | Other | Vertex | — |
| 77 | `TD_Exclamation` | `TD_Exclamation` | Other | Vertex | — |
| 78 | `TD_Amazed` | `TD_Amazed` | Other | Vertex | — |
| 79 | `TD_Sweaty` | `TD_Sweaty` | Other | Vertex | — |
| 80 | `TD_Hate` | `TD_Hate` | Other | Vertex | — |
| 81 | `TD_BeanieEye` | `TD_BeanieEye` | Other | Vertex | — |
| 82 | `TD_SymbolEye` | `TD_SymbolEye` | Other | Vertex | — |
| 83 | `TD_EggEyes` | `TD_EggEyes` | Other | Vertex | — |
| 84 | `TD_Speechless` | `TD_Speechless` | Other | Vertex | — |
| 85 | `TDS_Scale` | `TDS_Scale` | Other | Vertex | — |
| 86 | `TDS_Scale_02` | `TDS_Scale_02` | Other | Vertex | — |
| 87 | `TDS_Scale_03` | `TDS_Scale_03` | Other | Vertex | — |
| 88 | `TDS_Scale_04` | `TDS_Scale_04` | Other | Vertex | — |
| 89 | `TDS_Scale_05` | `TDS_Scale_05` | Other | Vertex | — |
| 90 | `TDS_Scale_06` | `TDS_Scale_06` | Other | Vertex | — |
| 91 | `TDS_Scale_07` | `TDS_Scale_07` | Other | Vertex | — |
| 92 | `TDS_yunxuan_01` | `TDS_yunxuan_01` | Other | Vertex | — |
| 93 | `TDS_xianquan_01` | `TDS_xianquan_01` | Other | Vertex | — |
| 94 | `TDS_StarEyes` | `TDS_StarEyes` | Other | Vertex | — |
| 95 | `TDS_liuhan` | `TDS_liuhan` | Other | Vertex | — |
| 96 | `TDS_heixian` | `TDS_heixian` | Other | Vertex | — |
| 97 | `TDS_Doubt` | `TDS_Doubt` | Other | Vertex | — |
| 98 | `TDS_lianhong` | `TDS_lianhong` | Other | Vertex | — |
| 99 | `TDS_haixiu` | `TDS_haixiu` | Other | Vertex | — |
| 100 | `TDS_Thorny` | `TDS_Thorny` | Other | Vertex | — |
| 101 | `TDS_Angry_01` | `TDS_Angry_01` | Other | Vertex | — |
| 102 | `TDS_Angry_02` | `TDS_Angry_02` | Other | Vertex | — |
| 103 | `TDS_Angry_03` | `TDS_Angry_03` | Other | Vertex | — |
| 104 | `TDS_Angry_04` | `TDS_Angry_04` | Other | Vertex | — |
| 105 | `TDS_Angry_05` | `TDS_Angry_05` | Other | Vertex | — |
| 106 | `TDS_shengluehao_01` | `TDS_shengluehao_01` | Other | Vertex | — |
| 107 | `TDS_shengluehao_02` | `TDS_shengluehao_02` | Other | Vertex | — |
| 108 | `TDS_shengluehao_03` | `TDS_shengluehao_03` | Other | Vertex | — |
| 109 | `TDS_shengluehao_04` | `TDS_shengluehao_04` | Other | Vertex | — |
| 110 | `TDS_tanqi_01` | `TDS_tanqi_01` | Other | Vertex | — |
| 111 | `TDS_tanqi_02` | `TDS_tanqi_02` | Other | Vertex | — |
| 112 | `TDS_tanqi_03` | `TDS_tanqi_03` | Other | Vertex | — |
| 113 | `TDS_tanqi_04` | `TDS_tanqi_04` | Other | Vertex | — |
| 114 | `TDS_yankuanglei_01` | `TDS_yankuanglei_01` | Other | Vertex | — |
| 115 | `TDS_gandonglei_01` | `TDS_gandonglei_01` | Other | Vertex | — |
| 116 | `TDS_liulei_01` | `TDS_liulei_01` | Other | Vertex | — |
| 117 | `TDS_liulei_02` | `TDS_liulei_02` | Other | Vertex | — |
| 118 | `TDS_liulei_03` | `TDS_liulei_03` | Other | Vertex | — |
| 119 | `TDS_liulei_04` | `TDS_liulei_04` | Other | Vertex | — |
| 120 | `TDS_leizhu_01` | `TDS_leizhu_01` | Other | Vertex | — |
| 121 | `TDS_leizhu_02` | `TDS_leizhu_02` | Other | Vertex | — |
| 122 | `TDS_leizhu_03` | `TDS_leizhu_03` | Other | Vertex | — |
| 123 | `TDS_leizhu_04` | `TDS_leizhu_04` | Other | Vertex | — |
| 124 | `TDS_leizhu_05` | `TDS_leizhu_05` | Other | Vertex | — |
| 125 | `TD_EyesClo` | `TD_EyesClo` | Other | Vertex | — |
| 126 | `jawOpen_Evil_02_OP` | `jawOpen_Evil_02_OP` | Other | Vertex | — |
| 127 | `jawOpen_Evil_02_CLO` | `jawOpen_Evil_02_CLO` | Other | Vertex | — |
| 128 | `Skill_face` | `Skill_face` | Other | Vertex | — |
| 129 | `EL_Angry_01_CLO` | `EL_Angry_01_CLO` | Other | Vertex | — |
| 130 | `EL_Sad_01_CLO` | `EL_Sad_01_CLO` | Other | Vertex | — |
| 131 | `EL_Despise_01_CLO` | `EL_Despise_01_CLO` | Other | Vertex | — |
| 132 | `EL_Evil_01_CLO` | `EL_Evil_01_CLO` | Other | Vertex | — |
| 133 | `EL_Tired_01_CLO` | `EL_Tired_01_CLO` | Other | Vertex | — |
| 134 | `EL_Serious_01_CLO` | `EL_Serious_01_CLO` | Other | Vertex | — |
| 135 | `EL_Thinking_01_CLO` | `EL_Thinking_01_CLO` | Other | Vertex | — |

<a id="model-39"></a>
### 39. Rosemary

- Format: PMX
- Asset path: `ww/chars/Rosemary/Rosemary.pmx`
- Embedded name: `罗斯玛丽`
- Embedded English name: `罗斯玛丽`
- Cache file: `04c73cef136d6fb6be1b8b417f0db976625e944969812f9dd8b0f47798962c18.asset`
- Morph counts: Eye: 28, Eyebrow: 15, Lip: 22, Other: 17; total: 82.
- Unmatched app channels: `smile`, `sad`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `にこり` | `B_Happy` | Eyebrow | Vertex | — |
| 1 | `にこり左` | — | Eyebrow | Vertex | — |
| 2 | `にこり右` | — | Eyebrow | Vertex | — |
| 3 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 4 | `怒り左` | — | Eyebrow | Vertex | — |
| 5 | `怒り右` | — | Eyebrow | Vertex | — |
| 6 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 7 | `上左` | — | Eyebrow | Vertex | — |
| 8 | `上右` | — | Eyebrow | Vertex | — |
| 9 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 10 | `下左` | — | Eyebrow | Vertex | — |
| 11 | `下右` | — | Eyebrow | Vertex | — |
| 12 | `平行` | `B_Flat` | Eyebrow | Vertex | — |
| 13 | `平行左` | — | Eyebrow | Vertex | — |
| 14 | `平行右` | — | Eyebrow | Vertex | — |
| 15 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 16 | `ウィンク２` | — | Eye | Vertex | — |
| 17 | `ウィンク２右` | — | Eye | Vertex | — |
| 18 | `笑い` | — | Eye | Vertex | smileEyes |
| 19 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 20 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 21 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 22 | `じと目左` | — | Eye | Vertex | — |
| 23 | `じと目右` | — | Eye | Vertex | — |
| 24 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 25 | `びっくり左` | — | Eye | Vertex | — |
| 26 | `びっくり右` | — | Eye | Vertex | — |
| 27 | `キリッ` | `E_Anger` | Eye | Vertex | — |
| 28 | `キリッ左` | — | Eye | Vertex | — |
| 29 | `キリッ右` | — | Eye | Vertex | — |
| 30 | `たれ目` | `E_Focus` | Eye | Vertex | — |
| 31 | `たれ目左` | — | Eye | Vertex | — |
| 32 | `たれ目右` | — | Eye | Vertex | — |
| 33 | `悲しい目` | `E_Sad` | Eye | Vertex | — |
| 34 | `悲しい目左` | — | Eye | Vertex | — |
| 35 | `悲しい目右` | — | Eye | Vertex | — |
| 36 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 37 | `瞳小左` | — | Eye | Vertex | — |
| 38 | `瞳小右` | — | Eye | Vertex | — |
| 39 | `Up` | `Pupil_Up` | Eye | Vertex | — |
| 40 | `Down` | `Pupil_Down` | Eye | Vertex | — |
| 41 | `Right` | `Pupil_R` | Eye | Vertex | — |
| 42 | `Left` | `Pupil_L` | Eye | Vertex | — |
| 43 | `あ` | `A` | Lip | Vertex | a |
| 44 | `あ２` | `Aa` | Lip | Vertex | — |
| 45 | `い` | `I` | Lip | Vertex | i |
| 46 | `う` | `U` | Lip | Vertex | u |
| 47 | `え` | `E` | Lip | Vertex | e |
| 48 | `お` | `O` | Lip | Vertex | o |
| 49 | `ワ` | `M_Laugh` | Lip | Vertex | — |
| 50 | `なんで` | `M_Scared` | Lip | Vertex | — |
| 51 | `口角下げ左` | `M_Ennui_L` | Lip | Vertex | — |
| 52 | `口角下げ右` | `M_Ennui_R` | Lip | Vertex | — |
| 53 | `口角上げ左` | `M_Smile_L` | Lip | Vertex | — |
| 54 | `口角上げ右` | `M_Smile_R` | Lip | Vertex | — |
| 55 | `口横広げ左` | `P_M_L_Add` | Lip | Vertex | — |
| 56 | `口横広げ右` | `P_M_R_Add` | Lip | Vertex | — |
| 57 | `口横広げ2右` | `P_M_ZR_Add` | Lip | Vertex | — |
| 58 | `口横広げ2左` | `P_M_ZL_Add` | Lip | Vertex | — |
| 59 | `齶前` | `C_Down_Face` | Lip | Vertex | — |
| 60 | `鼻上` | `P_Nose_Up` | Lip | Vertex | — |
| 61 | `鼻下` | `P_Nose_Down` | Lip | Vertex | — |
| 62 | `口上` | `P_M_Up_Add` | Lip | Vertex | — |
| 63 | `口下` | `P_M_Down_Add` | Lip | Vertex | — |
| 64 | `口角前` | `P_M_UpDownView_Add` | Lip | Vertex | — |
| 65 | `#` | `#` | Other | Vertex | — |
| 66 | `#2` | `#2` | Other | Vertex | — |
| 67 | `？` | `？` | Other | Vertex | — |
| 68 | `！` | `！` | Other | Vertex | — |
| 69 | `ZZZ` | `ZZZ` | Other | Vertex | — |
| 70 | `汗` | `汗` | Other | Vertex | — |
| 71 | `はちゅ` | `はちゅ` | Other | Vertex | — |
| 72 | `惊` | `惊` | Other | Vertex | — |
| 73 | `……` | `……` | Other | Vertex | — |
| 74 | `星目` | `星目` | Other | Vertex | — |
| 75 | `星目2` | `星目2` | Other | Vertex | — |
| 76 | `はぁと` | `はぁと` | Other | Vertex | — |
| 77 | `はぁと2` | `はぁと2` | Other | Vertex | — |
| 78 | `照れ` | `照れ` | Other | Vertex | — |
| 79 | `照れ2` | `照れ2` | Other | Vertex | — |
| 80 | `涙` | `涙` | Other | Vertex | — |
| 81 | `FaceRed` | `FaceRed` | Other | Vertex | — |

<a id="model-40"></a>
### 40. Saber

- Format: PMX
- Asset path: `hsr/chars/Saber/Saber.pmx`
- Embedded name: `Saber`
- Embedded English name: `Saber`
- Cache file: `3b757449c236a44abd92f912f1be2b3890b5f4848e2f8d507afe3dbbd67bf225.asset`
- Morph counts: Eye: 22, Eyebrow: 10, Lip: 37, Other: 16; total: 85.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `怒り` | `Brow_Angry` | Eyebrow | Vertex | angry |
| 1 | `怒り右` | `Brow_Doubt` | Eyebrow | Vertex | — |
| 2 | `真面目` | `Brow_Down` | Eyebrow | Vertex | — |
| 3 | `手前` | `Brow_Gentle` | Eyebrow | Vertex | — |
| 4 | `困る` | `Brow_Shy` | Eyebrow | Vertex | sad |
| 5 | `悲しい` | `Brow_Trouble` | Eyebrow | Vertex | — |
| 6 | `手前2` | `Brow_Surprise` | Eyebrow | Vertex | — |
| 7 | `やっかい` | `Brow_Trouble` | Eyebrow | Vertex | — |
| 8 | `下` | `Brow_Down` | Eyebrow | Vertex | — |
| 9 | `上` | `Brow_Up` | Eyebrow | Vertex | — |
| 10 | `まばたき` | `Eye_Close01` | Eye | Vertex | blink |
| 11 | `ウィンク２` | `Eye_Close01` | Eye | Vertex | — |
| 12 | `ｳｨﾝｸ２右` | `Eye_Close01` | Eye | Vertex | — |
| 13 | `笑い` | `Eye_Close02` | Eye | Vertex | smileEyes |
| 14 | `ウィンク` | `Eye_Close02` | Eye | Vertex | — |
| 15 | `ウィンク右` | `Eye_Close02` | Eye | Vertex | — |
| 16 | `笑い2` | `Eye_Close03` | Eye | Vertex | — |
| 17 | `ｷﾘｯ` | `Eye_Angry01` | Eye | Vertex | — |
| 18 | `ｷﾘｯ2` | `Eye_Angry02` | Eye | Vertex | — |
| 19 | `喜び` | `Eye_Doubt01` | Eye | Vertex | — |
| 20 | `喜び2` | `Eye_Doubt02` | Eye | Vertex | — |
| 21 | `慈愛` | `Eye_Gentle01` | Eye | Vertex | — |
| 22 | `慈愛2` | `Eye_Gentle02` | Eye | Vertex | — |
| 23 | `びっくり` | `Eye_Surprise01` | Eye | Vertex | surprised |
| 24 | `驚かす` | `Eye_Surprise02` | Eye | Vertex | — |
| 25 | `じと目` | `Eye_Sweat01` | Eye | Vertex | — |
| 26 | `じと目2` | `Eye_Sweat02` | Eye | Vertex | — |
| 27 | `怒目` | `Eye_Angry03` | Eye | Vertex | — |
| 28 | `怒目2` | `Eye_Angry04` | Eye | Vertex | — |
| 29 | `あ` | `Mouth_A` | Lip | Vertex | a |
| 30 | `い` | `Mouth_I` | Lip | Vertex | i |
| 31 | `う` | `Mouth_U` | Lip | Vertex | u |
| 32 | `え` | `Mouth_E` | Lip | Vertex | e |
| 33 | `お` | `Mouth_O` | Lip | Vertex | o |
| 34 | `ん` | `Mouth_N` | Lip | Vertex | — |
| 35 | `にやり` | `Mouth_Smile01` | Lip | Vertex | smile |
| 36 | `にやり２` | `Mouth_Proud01` | Lip | Vertex | — |
| 37 | `にやり３` | `Mouth_Proud02` | Lip | Vertex | — |
| 38 | `ムッ` | `Mouth_Angry01` | Lip | Vertex | — |
| 39 | `怒った` | `Mouth_Angry02` | Lip | Vertex | — |
| 40 | `怒った2` | `Mouth_Angry03` | Lip | Vertex | — |
| 41 | `口` | `Mouth_Angry04` | Lip | Vertex | — |
| 42 | `口角下げ` | `Mouth_Delta01` | Lip | Vertex | — |
| 43 | `口角上げ` | `Mouth_Smile01` | Lip | Vertex | — |
| 44 | `い2` | `Mouth_Delta02` | Lip | Vertex | — |
| 45 | `え2` | `Mouth_Delta03` | Lip | Vertex | — |
| 46 | `口下` | `Mouth_Down` | Lip | Vertex | — |
| 47 | `大口` | `Mouth_Max` | Lip | Vertex | — |
| 48 | `お2` | `Mouth_Minimum` | Lip | Vertex | — |
| 49 | `口横缩げ` | `Mouth_Narrow` | Lip | Vertex | — |
| 50 | `倒ω` | `Mouth_Pain01` | Lip | Vertex | — |
| 51 | `痛み` | `Mouth_Pain02` | Lip | Vertex | — |
| 52 | `痛み2` | `Mouth_Pain03` | Lip | Vertex | — |
| 53 | `痛み3` | `Mouth_Pain04` | Lip | Vertex | — |
| 54 | `口横缩げ2` | `Mouth_Pout` | Lip | Vertex | — |
| 55 | `ワ2` | `Mouth_Smile02` | Lip | Vertex | — |
| 56 | `ワ1` | `Mouth_Smile03` | Lip | Vertex | — |
| 57 | `ワ` | `Mouth_Smile04` | Lip | Vertex | — |
| 58 | `∧` | `Mouth_Twisted01` | Lip | Vertex | — |
| 59 | `口角下げ2` | `Mouth_Twisted02` | Lip | Vertex | — |
| 60 | `口上` | `Mouth_Up` | Lip | Vertex | — |
| 61 | `口横広げ` | `Mouth_Wide` | Lip | Vertex | — |
| 62 | `心配する` | `Mouth_Worry01` | Lip | Vertex | — |
| 63 | `心配する2` | `Mouth_Worry02` | Lip | Vertex | — |
| 64 | `え3` | `Mouth_Worry03` | Lip | Vertex | — |
| 65 | `えー` | `Mouth_Worry04` | Lip | Vertex | — |
| 66 | `はぅ` | — | Eye | Vertex | — |
| 67 | `はちゅ目` | — | Eye | Vertex | — |
| 68 | `なごみ` | — | Eye | Vertex | — |
| 69 | `はぁと` | — | Other | Vertex | — |
| 70 | `星目 ` | — | Other | Vertex | — |
| 71 | `涙` | — | Other | Vertex | — |
| 72 | `脸红` | — | Other | Vertex | — |
| 73 | `汗颜` | — | Other | Vertex | — |
| 74 | `111` | — | Other | Vertex | — |
| 75 | `1111` | — | Other | Vertex | — |
| 76 | `11+` | — | Other | Vertex | — |
| 77 | `怒` | — | Other | Vertex | — |
| 78 | `！` | — | Other | Vertex | — |
| 79 | `？` | — | Other | Vertex | — |
| 80 | `！！` | — | Other | Vertex | — |
| 81 | `汗` | — | Other | Vertex | — |
| 82 | `照れ` | — | Other | Material | — |
| 83 | `目影濃` | — | Other | Material | — |
| 84 | `目影消` | — | Other | Material | — |

<a id="model-41"></a>
### 41. Shinku RPG

- Format: PMX
- Asset path: `nte/chars/Shinku/Shinku_RPG_MMD_v2/Shinku_RPG.pmx`
- Embedded name: `Shinku RPG`
- Embedded English name: `Shinku RPG`
- Cache file: `c089ae1781e5008beb3266bc359a176db885b7cb74a775efc84bab4fa522775a.asset`
- Morph counts: Eye: 41, Eyebrow: 19, Lip: 39; total: 99.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `真面目` | `EB_Serious_01` | Eyebrow | Vertex | — |
| 1 | `困る` | `EB_Sad_01` | Eyebrow | Vertex | sad |
| 2 | `にこり` | `EB_Smile_01` | Eyebrow | Vertex | — |
| 3 | `怒り` | `EB_Angry_01` | Eyebrow | Vertex | angry |
| 4 | `眉びっくり` | `EB_Surprised_01` | Eyebrow | Vertex | — |
| 5 | `眉喜び` | `EB_happy_01` | Eyebrow | Vertex | — |
| 6 | `眉疑い` | `EB_Doubt_01` | Eyebrow | Vertex | — |
| 7 | `眉悪い` | `EB_Evil_01` | Eyebrow | Vertex | — |
| 8 | `眉疲れ` | `EB_Tired_01` | Eyebrow | Vertex | — |
| 9 | `眉考え` | `EB_Thinking_01` | Eyebrow | Vertex | — |
| 10 | `眉軽蔑` | `EB_Despise_01` | Eyebrow | Vertex | — |
| 11 | `左眉上下` | `EB_UD_L` | Eyebrow | Vertex | — |
| 12 | `右眉上下` | `EB_UD_R` | Eyebrow | Vertex | — |
| 13 | `眉回転左` | `EB_Rotate_01` | Eyebrow | Vertex | — |
| 14 | `眉回転右` | `EB_Rotate_02` | Eyebrow | Vertex | — |
| 15 | `上` | — | Eyebrow | Group | — |
| 16 | `下` | — | Eyebrow | Vertex | — |
| 17 | `眉頭左` | — | Eyebrow | Vertex | — |
| 18 | `眉頭右` | — | Eyebrow | Vertex | — |
| 19 | `まばたき` | `biyan` | Eye | Vertex | blink |
| 20 | `笑い` | `EL_Smile_01_CLO` | Eye | Vertex | smileEyes |
| 21 | `ウィンク` | `EL_Happy_r_CLO` | Eye | Vertex | — |
| 22 | `ウィンク右` | `EL_Happy_l_CLO` | Eye | Vertex | — |
| 23 | `ウィンク２` | `biyan_L` | Eye | Vertex | — |
| 24 | `ｳｨﾝｸ２右` | `biyan_R` | Eye | Vertex | — |
| 25 | `びっくり` | `EL_Surprised_01` | Eye | Vertex | surprised |
| 26 | `じと目` | `EL_Tired_01_OP` | Eye | Vertex | — |
| 27 | `ｷﾘｯ` | `EL_Angry_01_OP` | Eye | Vertex | — |
| 28 | `ｷﾘｯ2` | `EL_Evil_01_OP` | Eye | Vertex | — |
| 29 | `目を細める` | `EL_Sad_01_OP` | Eye | Vertex | — |
| 30 | `瞳小` | `eye_SF` | Eye | Vertex | — |
| 31 | `ハイライト消` | `EL_Light_Lose` | Eye | Vertex | — |
| 32 | `ハイライト上` | `EL_Light_Up` | Eye | Vertex | — |
| 33 | `ハイライト左` | `EL_Light_L` | Eye | Vertex | — |
| 34 | `目上` | `EL_Up` | Eye | Vertex | — |
| 35 | `目下` | `EL_Down` | Eye | Vertex | — |
| 36 | `目尻上` | `EL_CornerUp` | Eye | Vertex | — |
| 37 | `目尻下` | `EL_CornerDown` | Eye | Vertex | — |
| 38 | `真剣目` | `EL_Serious_01_OP` | Eye | Vertex | — |
| 39 | `軽蔑目` | `EL_Despise_01_OP` | Eye | Vertex | — |
| 40 | `視線上` | `look_U` | Eye | Vertex | — |
| 41 | `視線右上` | `look_RU` | Eye | Vertex | — |
| 42 | `視線右` | `look_R` | Eye | Vertex | — |
| 43 | `視線右下` | `look_RD` | Eye | Vertex | — |
| 44 | `視線下` | `look_D` | Eye | Vertex | — |
| 45 | `視線左下` | `look_LD` | Eye | Vertex | — |
| 46 | `視線左` | `look_L` | Eye | Vertex | — |
| 47 | `視線左上` | `look_LU` | Eye | Vertex | — |
| 48 | `疑い目開` | `EL_Doubt_01_OP` | Eye | Vertex | — |
| 49 | `考え目開` | `EL_Thinking_01_OP` | Eye | Vertex | — |
| 50 | `怒り目閉` | `EL_Angry_01_CLO` | Eye | Vertex | — |
| 51 | `悲しみ目閉` | `EL_Sad_01_CLO` | Eye | Vertex | — |
| 52 | `軽蔑目閉` | `EL_Despise_01_CLO` | Eye | Vertex | — |
| 53 | `疑い目閉` | `EL_Doubt_01_CLO` | Eye | Vertex | — |
| 54 | `悪い目閉` | `EL_Evil_01_CLO` | Eye | Vertex | — |
| 55 | `疲れ目閉` | `EL_Tired_01_CLO` | Eye | Vertex | — |
| 56 | `真剣目閉` | `EL_Serious_01_CLO` | Eye | Vertex | — |
| 57 | `考え目閉` | `EL_Thinking_01_CLO` | Eye | Vertex | — |
| 58 | `なごみ` | — | Eye | Group | — |
| 59 | `はぅ` | — | Eye | Group | — |
| 60 | `あ` | `jawOpen_a` | Lip | Vertex | a |
| 61 | `い` | `jawOpen_yi` | Lip | Vertex | i |
| 62 | `う` | `jawOpen_wu` | Lip | Vertex | u |
| 63 | `え` | `jawOpen_ei` | Lip | Vertex | e |
| 64 | `お` | `jawOpen_o` | Lip | Vertex | o |
| 65 | `あ2` | `jawOpen` | Lip | Vertex | — |
| 66 | `ワ` | `jawOpen_Happy_01_OP` | Lip | Vertex | — |
| 67 | `にやり` | `jawOpen_Evil_01_OP` | Lip | Vertex | smile |
| 68 | `にっこり` | `jawOpen_Smile_01_OP` | Lip | Vertex | — |
| 69 | `口すぼめ` | `mouthPucker` | Lip | Vertex | — |
| 70 | `口漏斗` | `mouthFunnel` | Lip | Vertex | — |
| 71 | `上唇巻き` | `mouthRollUpper` | Lip | Vertex | — |
| 72 | `下唇巻き` | `mouthRollLower` | Lip | Vertex | — |
| 73 | `驚き口開` | `jawOpen_Surprised_01_OP` | Lip | Vertex | — |
| 74 | `怒り口開` | `jawOpen_Angry_01_OP` | Lip | Vertex | — |
| 75 | `悲しみ口開` | `jawOpen_Sad_01_OP` | Lip | Vertex | — |
| 76 | `軽蔑口開` | `jawOpen_Despise_01_OP` | Lip | Vertex | — |
| 77 | `疑い口開` | `jawOpen_Doubt_01_OP` | Lip | Vertex | — |
| 78 | `疲れ口開` | `jawOpen_Tired_01_OP` | Lip | Vertex | — |
| 79 | `噛み口開` | `jawOpen_Chew_01_OP` | Lip | Vertex | — |
| 80 | `口拡大１` | `jawOpen_Scale_01_OP` | Lip | Vertex | — |
| 81 | `口拡大２` | `jawOpen_Scale_02_OP` | Lip | Vertex | — |
| 82 | `喜び口閉` | `jawOpen_Happy_01_CLO` | Lip | Vertex | — |
| 83 | `驚き口閉` | `jawOpen_Surprised_01_CLO` | Lip | Vertex | — |
| 84 | `怒り口閉` | `jawOpen_Angry_01_CLO` | Lip | Vertex | — |
| 85 | `笑顔口閉` | `jawOpen_Smile_01_CLO` | Lip | Vertex | — |
| 86 | `悲しみ口閉` | `jawOpen_Sad_01_CLO` | Lip | Vertex | — |
| 87 | `軽蔑口閉` | `jawOpen_Despise_01_CLO` | Lip | Vertex | — |
| 88 | `疑い口閉` | `jawOpen_Doubt_01_CLO` | Lip | Vertex | — |
| 89 | `悪い口閉` | `jawOpen_Evil_01_CLO` | Lip | Vertex | — |
| 90 | `疲れ口閉` | `jawOpen_Tired_01_CLO` | Lip | Vertex | — |
| 91 | `噛み口閉` | `jawOpen_Chew_01_CLO` | Lip | Vertex | — |
| 92 | `▲` | — | Lip | Group | — |
| 93 | `∧` | — | Lip | Group | — |
| 94 | `□` | — | Lip | Group | — |
| 95 | `ん` | — | Lip | Group | — |
| 96 | `口角上げ` | — | Lip | Group | — |
| 97 | `口角下げ` | — | Lip | Group | — |
| 98 | `口横広げ` | — | Lip | Group | — |

<a id="model-42"></a>
### 42. Shinku Swimsuit

- Format: PMX
- Asset path: `nte/chars/Shinku/Shinku_Swimsuit_MMD_v2/Shinku_Swimsuit.pmx`
- Embedded name: `Shinku Swimsuit`
- Embedded English name: `Shinku Swimsuit`
- Cache file: `ca22bab557197eca6f4f19a5351325af36c33b5e6353724836b5b433ff3edef4.asset`
- Morph counts: Eye: 41, Eyebrow: 19, Lip: 39; total: 99.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `真面目` | `EB_Serious_01` | Eyebrow | Vertex | — |
| 1 | `困る` | `EB_Sad_01` | Eyebrow | Vertex | sad |
| 2 | `にこり` | `EB_Smile_01` | Eyebrow | Vertex | — |
| 3 | `怒り` | `EB_Angry_01` | Eyebrow | Vertex | angry |
| 4 | `眉びっくり` | `EB_Surprised_01` | Eyebrow | Vertex | — |
| 5 | `眉喜び` | `EB_happy_01` | Eyebrow | Vertex | — |
| 6 | `眉疑い` | `EB_Doubt_01` | Eyebrow | Vertex | — |
| 7 | `眉悪い` | `EB_Evil_01` | Eyebrow | Vertex | — |
| 8 | `眉疲れ` | `EB_Tired_01` | Eyebrow | Vertex | — |
| 9 | `眉考え` | `EB_Thinking_01` | Eyebrow | Vertex | — |
| 10 | `眉軽蔑` | `EB_Despise_01` | Eyebrow | Vertex | — |
| 11 | `左眉上下` | `EB_UD_L` | Eyebrow | Vertex | — |
| 12 | `右眉上下` | `EB_UD_R` | Eyebrow | Vertex | — |
| 13 | `眉回転左` | `EB_Rotate_01` | Eyebrow | Vertex | — |
| 14 | `眉回転右` | `EB_Rotate_02` | Eyebrow | Vertex | — |
| 15 | `上` | — | Eyebrow | Group | — |
| 16 | `下` | — | Eyebrow | Vertex | — |
| 17 | `眉頭左` | — | Eyebrow | Vertex | — |
| 18 | `眉頭右` | — | Eyebrow | Vertex | — |
| 19 | `まばたき` | `biyan` | Eye | Vertex | blink |
| 20 | `笑い` | `EL_Smile_01_CLO` | Eye | Vertex | smileEyes |
| 21 | `ウィンク` | `EL_Happy_r_CLO` | Eye | Vertex | — |
| 22 | `ウィンク右` | `EL_Happy_l_CLO` | Eye | Vertex | — |
| 23 | `ウィンク２` | `biyan_L` | Eye | Vertex | — |
| 24 | `ｳｨﾝｸ２右` | `biyan_R` | Eye | Vertex | — |
| 25 | `びっくり` | `EL_Surprised_01` | Eye | Vertex | surprised |
| 26 | `じと目` | `EL_Tired_01_OP` | Eye | Vertex | — |
| 27 | `ｷﾘｯ` | `EL_Angry_01_OP` | Eye | Vertex | — |
| 28 | `ｷﾘｯ2` | `EL_Evil_01_OP` | Eye | Vertex | — |
| 29 | `目を細める` | `EL_Sad_01_OP` | Eye | Vertex | — |
| 30 | `瞳小` | `eye_SF` | Eye | Vertex | — |
| 31 | `ハイライト消` | `EL_Light_Lose` | Eye | Vertex | — |
| 32 | `ハイライト上` | `EL_Light_Up` | Eye | Vertex | — |
| 33 | `ハイライト左` | `EL_Light_L` | Eye | Vertex | — |
| 34 | `目上` | `EL_Up` | Eye | Vertex | — |
| 35 | `目下` | `EL_Down` | Eye | Vertex | — |
| 36 | `目尻上` | `EL_CornerUp` | Eye | Vertex | — |
| 37 | `目尻下` | `EL_CornerDown` | Eye | Vertex | — |
| 38 | `真剣目` | `EL_Serious_01_OP` | Eye | Vertex | — |
| 39 | `軽蔑目` | `EL_Despise_01_OP` | Eye | Vertex | — |
| 40 | `視線上` | `look_U` | Eye | Vertex | — |
| 41 | `視線右上` | `look_RU` | Eye | Vertex | — |
| 42 | `視線右` | `look_R` | Eye | Vertex | — |
| 43 | `視線右下` | `look_RD` | Eye | Vertex | — |
| 44 | `視線下` | `look_D` | Eye | Vertex | — |
| 45 | `視線左下` | `look_LD` | Eye | Vertex | — |
| 46 | `視線左` | `look_L` | Eye | Vertex | — |
| 47 | `視線左上` | `look_LU` | Eye | Vertex | — |
| 48 | `疑い目開` | `EL_Doubt_01_OP` | Eye | Vertex | — |
| 49 | `考え目開` | `EL_Thinking_01_OP` | Eye | Vertex | — |
| 50 | `怒り目閉` | `EL_Angry_01_CLO` | Eye | Vertex | — |
| 51 | `悲しみ目閉` | `EL_Sad_01_CLO` | Eye | Vertex | — |
| 52 | `軽蔑目閉` | `EL_Despise_01_CLO` | Eye | Vertex | — |
| 53 | `疑い目閉` | `EL_Doubt_01_CLO` | Eye | Vertex | — |
| 54 | `悪い目閉` | `EL_Evil_01_CLO` | Eye | Vertex | — |
| 55 | `疲れ目閉` | `EL_Tired_01_CLO` | Eye | Vertex | — |
| 56 | `真剣目閉` | `EL_Serious_01_CLO` | Eye | Vertex | — |
| 57 | `考え目閉` | `EL_Thinking_01_CLO` | Eye | Vertex | — |
| 58 | `なごみ` | — | Eye | Group | — |
| 59 | `はぅ` | — | Eye | Group | — |
| 60 | `あ` | `jawOpen_a` | Lip | Vertex | a |
| 61 | `い` | `jawOpen_yi` | Lip | Vertex | i |
| 62 | `う` | `jawOpen_wu` | Lip | Vertex | u |
| 63 | `え` | `jawOpen_ei` | Lip | Vertex | e |
| 64 | `お` | `jawOpen_o` | Lip | Vertex | o |
| 65 | `あ2` | `jawOpen` | Lip | Vertex | — |
| 66 | `ワ` | `jawOpen_Happy_01_OP` | Lip | Vertex | — |
| 67 | `にやり` | `jawOpen_Evil_01_OP` | Lip | Vertex | smile |
| 68 | `にっこり` | `jawOpen_Smile_01_OP` | Lip | Vertex | — |
| 69 | `口すぼめ` | `mouthPucker` | Lip | Vertex | — |
| 70 | `口漏斗` | `mouthFunnel` | Lip | Vertex | — |
| 71 | `上唇巻き` | `mouthRollUpper` | Lip | Vertex | — |
| 72 | `下唇巻き` | `mouthRollLower` | Lip | Vertex | — |
| 73 | `驚き口開` | `jawOpen_Surprised_01_OP` | Lip | Vertex | — |
| 74 | `怒り口開` | `jawOpen_Angry_01_OP` | Lip | Vertex | — |
| 75 | `悲しみ口開` | `jawOpen_Sad_01_OP` | Lip | Vertex | — |
| 76 | `軽蔑口開` | `jawOpen_Despise_01_OP` | Lip | Vertex | — |
| 77 | `疑い口開` | `jawOpen_Doubt_01_OP` | Lip | Vertex | — |
| 78 | `疲れ口開` | `jawOpen_Tired_01_OP` | Lip | Vertex | — |
| 79 | `噛み口開` | `jawOpen_Chew_01_OP` | Lip | Vertex | — |
| 80 | `口拡大１` | `jawOpen_Scale_01_OP` | Lip | Vertex | — |
| 81 | `口拡大２` | `jawOpen_Scale_02_OP` | Lip | Vertex | — |
| 82 | `喜び口閉` | `jawOpen_Happy_01_CLO` | Lip | Vertex | — |
| 83 | `驚き口閉` | `jawOpen_Surprised_01_CLO` | Lip | Vertex | — |
| 84 | `怒り口閉` | `jawOpen_Angry_01_CLO` | Lip | Vertex | — |
| 85 | `笑顔口閉` | `jawOpen_Smile_01_CLO` | Lip | Vertex | — |
| 86 | `悲しみ口閉` | `jawOpen_Sad_01_CLO` | Lip | Vertex | — |
| 87 | `軽蔑口閉` | `jawOpen_Despise_01_CLO` | Lip | Vertex | — |
| 88 | `疑い口閉` | `jawOpen_Doubt_01_CLO` | Lip | Vertex | — |
| 89 | `悪い口閉` | `jawOpen_Evil_01_CLO` | Lip | Vertex | — |
| 90 | `疲れ口閉` | `jawOpen_Tired_01_CLO` | Lip | Vertex | — |
| 91 | `噛み口閉` | `jawOpen_Chew_01_CLO` | Lip | Vertex | — |
| 92 | `▲` | — | Lip | Group | — |
| 93 | `∧` | — | Lip | Group | — |
| 94 | `□` | — | Lip | Group | — |
| 95 | `ん` | — | Lip | Group | — |
| 96 | `口角上げ` | — | Lip | Group | — |
| 97 | `口角下げ` | — | Lip | Group | — |
| 98 | `口横広げ` | — | Lip | Group | — |

<a id="model-43"></a>
### 43. Tribios

- Format: PMX
- Asset path: `hsr/chars/Tribios/大缇宝.pmx`
- Embedded name: `缇里西庇俄丝-大缇宝`
- Embedded English name: `红发`
- Cache file: `b97489b4f664c3a8dd95903cbf16fa1c343a8540517a26eeda4e59833ddf56f1.asset`
- Morph counts: Eye: 13, Eyebrow: 6, Lip: 35, Other: 1; total: 55.
- Unmatched app channels: `smile`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `まばたき` | `Eye_Close01` | Eye | Vertex | blink |
| 1 | `ｳｨﾝｸ２右` | `Eye_Close01` | Eye | Vertex | — |
| 2 | `ウィンク２` | `Eye_Close01` | Eye | Vertex | — |
| 3 | `笑い` | — | Eye | Vertex | smileEyes |
| 4 | `ウィンク右` | — | Eye | Vertex | — |
| 5 | `ウィンク` | — | Eye | Vertex | — |
| 6 | `びっくり` | — | Eye | Vertex | surprised |
| 7 | `じと目` | — | Eye | Vertex | — |
| 8 | `ｷﾘｯ` | — | Eye | Vertex | — |
| 9 | `悲しい目` | — | Eye | Vertex | — |
| 10 | `瞳小` | — | Eye | Vertex | — |
| 11 | `恐ろしい子！` | — | Eye | Vertex | — |
| 12 | `highlight off` | — | Eye | Vertex | — |
| 13 | `あ` | `Mouth_A` | Lip | Vertex | a |
| 14 | `い` | `Mouth_I` | Lip | Vertex | i |
| 15 | `い1` | `Mouth_N` | Lip | Vertex | — |
| 16 | `う` | `Mouth_Minimum` | Lip | Vertex | u |
| 17 | `え` | — | Lip | Vertex | e |
| 18 | `お` | `Mouth_O` | Lip | Vertex | o |
| 19 | `お1` | `Mouth_U` | Lip | Vertex | — |
| 20 | `あ２` | `Mouth_Max` | Lip | Vertex | — |
| 21 | `倒ω` | `Mouth_Angry01` | Lip | Vertex | — |
| 22 | `にやり２` | `Mouth_Proud01` | Lip | Vertex | — |
| 23 | `にやり２1` | `Mouth_Proud02` | Lip | Vertex | — |
| 24 | `□` | `Mouth_Angry04` | Lip | Vertex | — |
| 25 | `□1` | `Mouth_Angry03` | Lip | Vertex | — |
| 26 | `□2` | `Mouth_Angry02` | Lip | Vertex | — |
| 27 | `□3` | `Mouth_Worry02` | Lip | Vertex | — |
| 28 | `□4` | `Mouth_Worry03` | Lip | Vertex | — |
| 29 | `□5` | `Mouth_Worry04` | Lip | Vertex | — |
| 30 | `ワ` | `Mouth_Smile04` | Lip | Vertex | — |
| 31 | `ワ1` | `Mouth_Smile03` | Lip | Vertex | — |
| 32 | `ワ2` | `Mouth_Smile02` | Lip | Vertex | — |
| 33 | `ワ3` | `Mouth_Smile01` | Lip | Vertex | — |
| 34 | `口上` | `Mouth_Up` | Lip | Vertex | — |
| 35 | `口下` | `Mouth_Down` | Lip | Vertex | — |
| 36 | `口角下げ` | `Mouth_Pain01` | Lip | Vertex | — |
| 37 | `口角下げ0` | `Mouth_Delta01` | Lip | Vertex | — |
| 38 | `口角下げ1` | `Mouth_Delta02` | Lip | Vertex | — |
| 39 | `口角下げ2` | `Mouth_Delta03` | Lip | Vertex | — |
| 40 | `口角下げ3` | `Mouth_Pain02` | Lip | Vertex | — |
| 41 | `口角下げ4` | `Mouth_Pain03` | Lip | Vertex | — |
| 42 | `口角下げ5` | `Mouth_Pain04` | Lip | Vertex | — |
| 43 | `口角下げ7` | `Mouth_Twisted02` | Lip | Vertex | — |
| 44 | `口角下げ8` | `Mouth_Worry01` | Lip | Vertex | — |
| 45 | `口横缩げ` | `Mouth_Narrow` | Lip | Vertex | — |
| 46 | `口横缩げ1` | `Mouth_Pout` | Lip | Vertex | — |
| 47 | `口横広げ` | `Mouth_Wide` | Lip | Vertex | — |
| 48 | `照れ` | — | Other | Vertex | — |
| 49 | `怒り` | — | Eyebrow | Vertex | angry |
| 50 | `困る` | — | Eyebrow | Vertex | sad |
| 51 | `にこり` | — | Eyebrow | Vertex | — |
| 52 | `真面目` | — | Eyebrow | Vertex | — |
| 53 | `上` | — | Eyebrow | Vertex | — |
| 54 | `下` | — | Eyebrow | Vertex | — |

<a id="model-44"></a>
### 44. Twiggy

- Format: PMX
- Asset path: `zzz/chars/Twiggy/Girl A/Girl A.pmx`
- Embedded name: `NPC_A_Model`
- Embedded English name: `NPC_A_Model`
- Cache file: `ae208e5cb292403d0329a6dffede6d52dc18bb188dfaa3c58541ff37ac32df16.asset`
- Morph counts: Other: 96; total: 96.
- Unmatched app channels: `a`, `i`, `u`, `e`, `o`, `blink`, `smileEyes`, `smile`, `sad`, `angry`, `surprised`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `0002_SilverAnby_Face_morph0` | `0002_SilverAnby_Face_morph0` | Other | Vertex | — |
| 1 | `0002_SilverAnby_Face_morph1` | `0002_SilverAnby_Face_morph1` | Other | Vertex | — |
| 2 | `0002_SilverAnby_Face_morph2` | `0002_SilverAnby_Face_morph2` | Other | Vertex | — |
| 3 | `0002_SilverAnby_Face_morph3` | `0002_SilverAnby_Face_morph3` | Other | Vertex | — |
| 4 | `0002_SilverAnby_Face_morph4` | `0002_SilverAnby_Face_morph4` | Other | Vertex | — |
| 5 | `0002_SilverAnby_Face_morph5` | `0002_SilverAnby_Face_morph5` | Other | Vertex | — |
| 6 | `0002_SilverAnby_Face_morph6` | `0002_SilverAnby_Face_morph6` | Other | Vertex | — |
| 7 | `0002_SilverAnby_Face_morph7` | `0002_SilverAnby_Face_morph7` | Other | Vertex | — |
| 8 | `0002_SilverAnby_Face_morph8` | `0002_SilverAnby_Face_morph8` | Other | Vertex | — |
| 9 | `0002_SilverAnby_Face_morph9` | `0002_SilverAnby_Face_morph9` | Other | Vertex | — |
| 10 | `0002_SilverAnby_Face_morph10` | `0002_SilverAnby_Face_morph10` | Other | Vertex | — |
| 11 | `0002_SilverAnby_Face_morph11` | `0002_SilverAnby_Face_morph11` | Other | Vertex | — |
| 12 | `0002_SilverAnby_Face_morph12` | `0002_SilverAnby_Face_morph12` | Other | Vertex | — |
| 13 | `0002_SilverAnby_Face_morph13` | `0002_SilverAnby_Face_morph13` | Other | Vertex | — |
| 14 | `0002_SilverAnby_Face_morph14` | `0002_SilverAnby_Face_morph14` | Other | Vertex | — |
| 15 | `0002_SilverAnby_Face_morph15` | `0002_SilverAnby_Face_morph15` | Other | Vertex | — |
| 16 | `0002_SilverAnby_Face_morph16` | `0002_SilverAnby_Face_morph16` | Other | Vertex | — |
| 17 | `0002_SilverAnby_Face_morph17` | `0002_SilverAnby_Face_morph17` | Other | Vertex | — |
| 18 | `0002_SilverAnby_Face_morph18` | `0002_SilverAnby_Face_morph18` | Other | Vertex | — |
| 19 | `0002_SilverAnby_Face_morph19` | `0002_SilverAnby_Face_morph19` | Other | Vertex | — |
| 20 | `0002_SilverAnby_Face_morph20` | `0002_SilverAnby_Face_morph20` | Other | Vertex | — |
| 21 | `0002_SilverAnby_Face_morph21` | `0002_SilverAnby_Face_morph21` | Other | Vertex | — |
| 22 | `0002_SilverAnby_Face_morph22` | `0002_SilverAnby_Face_morph22` | Other | Vertex | — |
| 23 | `0002_SilverAnby_Face_morph23` | `0002_SilverAnby_Face_morph23` | Other | Vertex | — |
| 24 | `0002_SilverAnby_Face_morph24` | `0002_SilverAnby_Face_morph24` | Other | Vertex | — |
| 25 | `0002_SilverAnby_Face_morph25` | `0002_SilverAnby_Face_morph25` | Other | Vertex | — |
| 26 | `0002_SilverAnby_Face_morph26` | `0002_SilverAnby_Face_morph26` | Other | Vertex | — |
| 27 | `0002_SilverAnby_Face_morph27` | `0002_SilverAnby_Face_morph27` | Other | Vertex | — |
| 28 | `0002_SilverAnby_Face_morph28` | `0002_SilverAnby_Face_morph28` | Other | Vertex | — |
| 29 | `0002_SilverAnby_Face_morph29` | `0002_SilverAnby_Face_morph29` | Other | Vertex | — |
| 30 | `0002_SilverAnby_Face_morph30` | `0002_SilverAnby_Face_morph30` | Other | Vertex | — |
| 31 | `0002_SilverAnby_Face_morph31` | `0002_SilverAnby_Face_morph31` | Other | Vertex | — |
| 32 | `0003_SilverAnby_Face_morph0` | `0003_SilverAnby_Face_morph0` | Other | Vertex | — |
| 33 | `0003_SilverAnby_Face_morph1` | `0003_SilverAnby_Face_morph1` | Other | Vertex | — |
| 34 | `0003_SilverAnby_Face_morph2` | `0003_SilverAnby_Face_morph2` | Other | Vertex | — |
| 35 | `0003_SilverAnby_Face_morph3` | `0003_SilverAnby_Face_morph3` | Other | Vertex | — |
| 36 | `0003_SilverAnby_Face_morph4` | `0003_SilverAnby_Face_morph4` | Other | Vertex | — |
| 37 | `0003_SilverAnby_Face_morph5` | `0003_SilverAnby_Face_morph5` | Other | Vertex | — |
| 38 | `0003_SilverAnby_Face_morph6` | `0003_SilverAnby_Face_morph6` | Other | Vertex | — |
| 39 | `0003_SilverAnby_Face_morph7` | `0003_SilverAnby_Face_morph7` | Other | Vertex | — |
| 40 | `0003_SilverAnby_Face_morph8` | `0003_SilverAnby_Face_morph8` | Other | Vertex | — |
| 41 | `0003_SilverAnby_Face_morph9` | `0003_SilverAnby_Face_morph9` | Other | Vertex | — |
| 42 | `0003_SilverAnby_Face_morph10` | `0003_SilverAnby_Face_morph10` | Other | Vertex | — |
| 43 | `0003_SilverAnby_Face_morph11` | `0003_SilverAnby_Face_morph11` | Other | Vertex | — |
| 44 | `0003_SilverAnby_Face_morph12` | `0003_SilverAnby_Face_morph12` | Other | Vertex | — |
| 45 | `0003_SilverAnby_Face_morph13` | `0003_SilverAnby_Face_morph13` | Other | Vertex | — |
| 46 | `0003_SilverAnby_Face_morph14` | `0003_SilverAnby_Face_morph14` | Other | Vertex | — |
| 47 | `0003_SilverAnby_Face_morph15` | `0003_SilverAnby_Face_morph15` | Other | Vertex | — |
| 48 | `0003_SilverAnby_Face_morph16` | `0003_SilverAnby_Face_morph16` | Other | Vertex | — |
| 49 | `0003_SilverAnby_Face_morph17` | `0003_SilverAnby_Face_morph17` | Other | Vertex | — |
| 50 | `0003_SilverAnby_Face_morph18` | `0003_SilverAnby_Face_morph18` | Other | Vertex | — |
| 51 | `0003_SilverAnby_Face_morph19` | `0003_SilverAnby_Face_morph19` | Other | Vertex | — |
| 52 | `0003_SilverAnby_Face_morph20` | `0003_SilverAnby_Face_morph20` | Other | Vertex | — |
| 53 | `0003_SilverAnby_Face_morph21` | `0003_SilverAnby_Face_morph21` | Other | Vertex | — |
| 54 | `0003_SilverAnby_Face_morph22` | `0003_SilverAnby_Face_morph22` | Other | Vertex | — |
| 55 | `0003_SilverAnby_Face_morph23` | `0003_SilverAnby_Face_morph23` | Other | Vertex | — |
| 56 | `0003_SilverAnby_Face_morph24` | `0003_SilverAnby_Face_morph24` | Other | Vertex | — |
| 57 | `0003_SilverAnby_Face_morph25` | `0003_SilverAnby_Face_morph25` | Other | Vertex | — |
| 58 | `0003_SilverAnby_Face_morph26` | `0003_SilverAnby_Face_morph26` | Other | Vertex | — |
| 59 | `0003_SilverAnby_Face_morph27` | `0003_SilverAnby_Face_morph27` | Other | Vertex | — |
| 60 | `0003_SilverAnby_Face_morph28` | `0003_SilverAnby_Face_morph28` | Other | Vertex | — |
| 61 | `0003_SilverAnby_Face_morph29` | `0003_SilverAnby_Face_morph29` | Other | Vertex | — |
| 62 | `0003_SilverAnby_Face_morph30` | `0003_SilverAnby_Face_morph30` | Other | Vertex | — |
| 63 | `0003_SilverAnby_Face_morph31` | `0003_SilverAnby_Face_morph31` | Other | Vertex | — |
| 64 | `0004_SilverAnby_Face_morph0` | `0004_SilverAnby_Face_morph0` | Other | Vertex | — |
| 65 | `0004_SilverAnby_Face_morph1` | `0004_SilverAnby_Face_morph1` | Other | Vertex | — |
| 66 | `0004_SilverAnby_Face_morph2` | `0004_SilverAnby_Face_morph2` | Other | Vertex | — |
| 67 | `0004_SilverAnby_Face_morph3` | `0004_SilverAnby_Face_morph3` | Other | Vertex | — |
| 68 | `0004_SilverAnby_Face_morph4` | `0004_SilverAnby_Face_morph4` | Other | Vertex | — |
| 69 | `0004_SilverAnby_Face_morph5` | `0004_SilverAnby_Face_morph5` | Other | Vertex | — |
| 70 | `0004_SilverAnby_Face_morph6` | `0004_SilverAnby_Face_morph6` | Other | Vertex | — |
| 71 | `0004_SilverAnby_Face_morph7` | `0004_SilverAnby_Face_morph7` | Other | Vertex | — |
| 72 | `0004_SilverAnby_Face_morph8` | `0004_SilverAnby_Face_morph8` | Other | Vertex | — |
| 73 | `0004_SilverAnby_Face_morph9` | `0004_SilverAnby_Face_morph9` | Other | Vertex | — |
| 74 | `0004_SilverAnby_Face_morph10` | `0004_SilverAnby_Face_morph10` | Other | Vertex | — |
| 75 | `0004_SilverAnby_Face_morph11` | `0004_SilverAnby_Face_morph11` | Other | Vertex | — |
| 76 | `0004_SilverAnby_Face_morph12` | `0004_SilverAnby_Face_morph12` | Other | Vertex | — |
| 77 | `0004_SilverAnby_Face_morph13` | `0004_SilverAnby_Face_morph13` | Other | Vertex | — |
| 78 | `0004_SilverAnby_Face_morph14` | `0004_SilverAnby_Face_morph14` | Other | Vertex | — |
| 79 | `0004_SilverAnby_Face_morph15` | `0004_SilverAnby_Face_morph15` | Other | Vertex | — |
| 80 | `0004_SilverAnby_Face_morph16` | `0004_SilverAnby_Face_morph16` | Other | Vertex | — |
| 81 | `0004_SilverAnby_Face_morph17` | `0004_SilverAnby_Face_morph17` | Other | Vertex | — |
| 82 | `0004_SilverAnby_Face_morph18` | `0004_SilverAnby_Face_morph18` | Other | Vertex | — |
| 83 | `0004_SilverAnby_Face_morph19` | `0004_SilverAnby_Face_morph19` | Other | Vertex | — |
| 84 | `0004_SilverAnby_Face_morph20` | `0004_SilverAnby_Face_morph20` | Other | Vertex | — |
| 85 | `0004_SilverAnby_Face_morph21` | `0004_SilverAnby_Face_morph21` | Other | Vertex | — |
| 86 | `0004_SilverAnby_Face_morph22` | `0004_SilverAnby_Face_morph22` | Other | Vertex | — |
| 87 | `0004_SilverAnby_Face_morph23` | `0004_SilverAnby_Face_morph23` | Other | Vertex | — |
| 88 | `0004_SilverAnby_Face_morph24` | `0004_SilverAnby_Face_morph24` | Other | Vertex | — |
| 89 | `0004_SilverAnby_Face_morph25` | `0004_SilverAnby_Face_morph25` | Other | Vertex | — |
| 90 | `0004_SilverAnby_Face_morph26` | `0004_SilverAnby_Face_morph26` | Other | Vertex | — |
| 91 | `0004_SilverAnby_Face_morph27` | `0004_SilverAnby_Face_morph27` | Other | Vertex | — |
| 92 | `0004_SilverAnby_Face_morph28` | `0004_SilverAnby_Face_morph28` | Other | Vertex | — |
| 93 | `0004_SilverAnby_Face_morph29` | `0004_SilverAnby_Face_morph29` | Other | Vertex | — |
| 94 | `0004_SilverAnby_Face_morph30` | `0004_SilverAnby_Face_morph30` | Other | Vertex | — |
| 95 | `0004_SilverAnby_Face_morph31` | `0004_SilverAnby_Face_morph31` | Other | Vertex | — |

<a id="model-45"></a>
### 45. Xiangli Yao

- Format: PMX
- Asset path: `ww/chars/Xiangli Yao/Xiangli Yao.pmx`
- Embedded name: `鳴潮_相里要`
- Embedded English name: `New MMD Model`
- Cache file: `e4517bd789b6d9bd9ae440e440d34fe3425883690b7e9e423810a7974d6c8ac3.asset`
- Morph counts: Eye: 28, Eyebrow: 24, Lip: 48, Other: 38; total: 138.
- Unmatched app channels: none.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `真面目` | — | Eyebrow | Vertex | — |
| 1 | `真面目L` | — | Eyebrow | Vertex | — |
| 2 | `真面目R` | — | Eyebrow | Vertex | — |
| 3 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 4 | `怒りL` | `B_Anger` | Eyebrow | Vertex | — |
| 5 | `怒りR` | `B_Anger` | Eyebrow | Vertex | — |
| 6 | `にこり` | `B_Happy` | Eyebrow | Vertex | — |
| 7 | `にこりL` | `B_Happy` | Eyebrow | Vertex | — |
| 8 | `にこりR` | `B_Happy` | Eyebrow | Vertex | — |
| 9 | `にこり2` | `B_Cheerful` | Eyebrow | Vertex | — |
| 10 | `困る` | `B_Sad` | Eyebrow | Vertex | sad |
| 11 | `困るL` | `B_Sad` | Eyebrow | Vertex | — |
| 12 | `困るR` | `B_Sad` | Eyebrow | Vertex | — |
| 13 | `平行` | `B_Flat` | Eyebrow | Vertex | — |
| 14 | `怪訝右` | `B_AH_R` | Eyebrow | Vertex | — |
| 15 | `怪訝左` | `B_AH_L` | Eyebrow | Vertex | — |
| 16 | `眉 內` | `S_10` | Eyebrow | Vertex | — |
| 17 | `中` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 18 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 19 | `上L` | `B_Up_Add` | Eyebrow | Vertex | — |
| 20 | `上R` | `B_Up_Add` | Eyebrow | Vertex | — |
| 21 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 22 | `下L` | `B_Down_Add` | Eyebrow | Vertex | — |
| 23 | `下R` | `B_Down_Add` | Eyebrow | Vertex | — |
| 24 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 25 | `笑い` | — | Eye | Vertex | smileEyes |
| 26 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 27 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 28 | ` ウィンク２` | `E_Close` | Eye | Vertex | — |
| 29 | `ｳｨﾝｸ２右` | `E_Close` | Eye | Vertex | — |
| 30 | `なごみ` | — | Eye | Vertex | — |
| 31 | `なごみL` | — | Eye | Vertex | — |
| 32 | `なごみR` | — | Eye | Vertex | — |
| 33 | `ｷﾘｯ` | `E_Anger` | Eye | Vertex | — |
| 34 | `はぅ` | — | Eye | Vertex | — |
| 35 | `はちゅ目` | — | Eye | Vertex | — |
| 36 | `垂れ目` | `E_Sad` | Eye | Vertex | — |
| 37 | `じと目2` | `E_Focus` | Eye | Vertex | — |
| 38 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 39 | `じと目L` | `E_Insipid` | Eye | Vertex | — |
| 40 | `じと目R` | `E_Insipid` | Eye | Vertex | — |
| 41 | `up` | `Pupil_Up` | Eye | Vertex | — |
| 42 | `down` | `Pupil_Down` | Eye | Vertex | — |
| 43 | `right` | `Pupil_R` | Eye | Vertex | — |
| 44 | `left` | `Pupil_L` | Eye | Vertex | — |
| 45 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 46 | `瞳小L` | `Pupil_Scale` | Eye | Vertex | — |
| 47 | `瞳小R` | `Pupil_Scale` | Eye | Vertex | — |
| 48 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 49 | `笑い目` | `E_Blephar` | Eye | Vertex | — |
| 50 | `星目` | — | Eye | Vertex | — |
| 51 | `はぁと` | — | Eye | Vertex | — |
| 52 | `あ` | `A` | Lip | Vertex | a |
| 53 | `い` | `I` | Lip | Vertex | i |
| 54 | `う` | `U` | Lip | Vertex | u |
| 55 | `え` | `E` | Lip | Vertex | e |
| 56 | `お` | `O` | Lip | Vertex | o |
| 57 | `口` | `Aa` | Lip | Vertex | — |
| 58 | `い3` | `M_OpenSmall` | Lip | Vertex | — |
| 59 | `いい` | `M_Laugh` | Lip | Vertex | — |
| 60 | `д` | `M_Scared` | Lip | Vertex | — |
| 61 | `い2` | `M_ScaredTooth` | Lip | Vertex | — |
| 62 | `(○｀ε´○)` | `M_Anger` | Lip | Vertex | — |
| 63 | `あ２` | `M_Trapezoid` | Lip | Vertex | — |
| 64 | `お2` | `M_O` | Lip | Vertex | — |
| 65 | `あ3` | `M_A` | Lip | Vertex | — |
| 66 | `M` | `M_Nutcracker` | Lip | Vertex | — |
| 67 | `にやり` | — | Lip | Vertex | smile |
| 68 | `∧` | — | Lip | Vertex | — |
| 69 | `ぺろっ` | — | Lip | Vertex | — |
| 70 | `口角上げ` | — | Lip | Vertex | — |
| 71 | `口角下げ` | — | Lip | Vertex | — |
| 72 | `口横広げ` | — | Lip | Vertex | — |
| 73 | `口横狭め` | `P_M_Scale_Add` | Lip | Vertex | — |
| 74 | `右口横広げ` | `P_M_R_Add` | Lip | Vertex | — |
| 75 | `左口横広げ` | `P_M_L_Add` | Lip | Vertex | — |
| 76 | `右口角上げ` | `M_Smile_R` | Lip | Vertex | — |
| 77 | `左口角上げ` | `M_Smile_L` | Lip | Vertex | — |
| 78 | `右口角下げ` | `M_Ennui_R` | Lip | Vertex | — |
| 79 | `左口角下げ` | `M_Ennui_L` | Lip | Vertex | — |
| 80 | `右口角上げ2` | `P_M_ZR_Add` | Lip | Vertex | — |
| 81 | `左口角上げ2` | `P_M_ZL_Add` | Lip | Vertex | — |
| 82 | `C_ZR_Face` | `C_ZR_Face` | Lip | Vertex | — |
| 83 | `C_ZL_Face` | `C_ZL_Face` | Lip | Vertex | — |
| 84 | `C_Down_Face` | `C_Down_Face` | Lip | Vertex | — |
| 85 | `C_Up_Face` | `C_Up_Face` | Lip | Vertex | — |
| 86 | `lip thick` | `C_M_Distant` | Lip | Vertex | — |
| 87 | `鼻_Nose_Up` | `P_Nose_Up` | Lip | Vertex | — |
| 88 | `鼻_Down` | `P_Nose_Down` | Lip | Vertex | — |
| 89 | `口_Up_Add` | `P_M_Up_Add` | Lip | Vertex | — |
| 90 | `口_Down_Add` | `P_M_Down_Add` | Lip | Vertex | — |
| 91 | `口_RMove_Add` | `P_M_RMove_Add` | Lip | Vertex | — |
| 92 | `口_LMove_Add` | `P_M_LMove_Add` | Lip | Vertex | — |
| 93 | `口_MidPoint_Add` | `P_M_MidPoint_Add` | Lip | Vertex | — |
| 94 | `口_UpDownView_Add` | `P_M_UpDownView_Add` | Lip | Vertex | — |
| 95 | `nose off` | `S_01` | Lip | Vertex | — |
| 96 | `にやり2` | `S_05` | Lip | Vertex | — |
| 97 | `上lip 調整` | `S_06` | Lip | Vertex | — |
| 98 | `上lip 調整2` | `S_07` | Lip | Vertex | — |
| 99 | `face behind move` | `S_11` | Lip | Vertex | — |
| 100 | `前髮非透過` | — | Other | Material | — |
| 101 | `照れ` | — | Other | Vertex | — |
| 102 | `照れ2` | — | Other | Vertex | — |
| 103 | `照れ透過` | — | Other | Material | — |
| 104 | `お尻直し` | — | Other | Vertex | — |
| 105 | `L_P` | `L_P` | Other | Vertex | — |
| 106 | `L_F` | `L_F` | Other | Vertex | — |
| 107 | `L_B` | `L_B` | Other | Vertex | — |
| 108 | `L_F_U` | `L_F_U` | Other | Vertex | — |
| 109 | `L_B_U` | `L_B_U` | Other | Vertex | — |
| 110 | `L_Up` | `L_Up` | Other | Vertex | — |
| 111 | `L_Up_U` | `L_Up_U` | Other | Vertex | — |
| 112 | `R_P` | `R_P` | Other | Vertex | — |
| 113 | `R_F` | `R_F` | Other | Vertex | — |
| 114 | `R_B` | `R_B` | Other | Vertex | — |
| 115 | `R_F_U` | `R_F_U` | Other | Vertex | — |
| 116 | `R_B_U` | `R_B_U` | Other | Vertex | — |
| 117 | `R_Up` | `R_Up` | Other | Vertex | — |
| 118 | `R_Up_U` | `R_Up_U` | Other | Vertex | — |
| 119 | `eye al` | — | Other | Material | — |
| 120 | `eye hi al` | — | Other | Material | — |
| 121 | `eye hi off` | — | Other | Material | — |
| 122 | `body line al` | — | Other | Material | — |
| 123 | `star al` | — | Other | Material | — |
| 124 | `arm line al` | — | Other | Material | — |
| 125 | `見開く` | — | Other | Group | — |
| 126 | `にこりB` | — | Other | Group | — |
| 127 | `困るB` | — | Other | Group | — |
| 128 | `怒りB` | — | Other | Group | — |
| 129 | `にこりA` | — | Other | Group | — |
| 130 | `真面目A` | — | Other | Group | — |
| 131 | `困るA` | — | Other | Group | — |
| 132 | `怒りA` | — | Other | Group | — |
| 133 | `笑いA` | — | Other | Group | — |
| 134 | `まばたきA` | — | Other | Group | — |
| 135 | `寄り目` | — | Other | Bone | — |
| 136 | `+目下` | — | Other | Bone | — |
| 137 | `+目上` | — | Other | Bone | — |

<a id="model-46"></a>
### 46. Youhu

- Format: PMX
- Asset path: `ww/chars/Youhu/Youhu.pmx`
- Embedded name: `釉瑚`
- Embedded English name: `New MMD Model`
- Cache file: `76a2aa2255be40f5cb5165bc905ec5efecbf6548810c1996239e80ec2e2d8a1d.asset`
- Morph counts: Eye: 38, Eyebrow: 24, Lip: 39, Other: 23; total: 124.
- Unmatched app channels: `smile`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `困る` | `B_Sad` | Eyebrow | Vertex | sad |
| 1 | `困る左` | `B_Sad` | Eyebrow | Vertex | — |
| 2 | `困る右` | `B_Sad` | Eyebrow | Vertex | — |
| 3 | `にこり` | `B_Happy` | Eyebrow | Vertex | — |
| 4 | `にこり左` | `B_Happy` | Eyebrow | Vertex | — |
| 5 | `にこり右` | `B_Happy` | Eyebrow | Vertex | — |
| 6 | `にこり２` | `B_Cheerful` | Eyebrow | Vertex | — |
| 7 | `にこり２左` | `B_Cheerful` | Eyebrow | Vertex | — |
| 8 | `にこり２右` | `B_Cheerful` | Eyebrow | Vertex | — |
| 9 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 10 | `怒り左` | `B_AH_L` | Eyebrow | Vertex | — |
| 11 | `怒り右` | `B_AH_R` | Eyebrow | Vertex | — |
| 12 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 13 | `上左` | `B_Up_Add` | Eyebrow | Vertex | — |
| 14 | `上右` | `B_Up_Add` | Eyebrow | Vertex | — |
| 15 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 16 | `下左` | `B_Down_Add` | Eyebrow | Vertex | — |
| 17 | `下右` | `B_Down_Add` | Eyebrow | Vertex | — |
| 18 | `平行` | `B_Flat` | Eyebrow | Vertex | — |
| 19 | `平行左` | `B_Flat` | Eyebrow | Vertex | — |
| 20 | `平行右` | `B_Flat` | Eyebrow | Vertex | — |
| 21 | `入` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 22 | `入左` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 23 | `入右` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 24 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 25 | `ウィンク２` | `E_Close` | Eye | Vertex | — |
| 26 | `ウィンク２右` | `E_Close` | Eye | Vertex | — |
| 27 | `笑い` | `E_Smile_L` | Eye | Vertex | smileEyes |
| 28 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 29 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 30 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 31 | `じと目左` | `E_Insipid` | Eye | Vertex | — |
| 32 | `じと目右` | `E_Insipid` | Eye | Vertex | — |
| 33 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 34 | `びっくり左` | `E_Stare` | Eye | Vertex | — |
| 35 | `びっくり右` | `E_Stare` | Eye | Vertex | — |
| 36 | `キリッ` | `E_Anger` | Eye | Vertex | — |
| 37 | `キリッ左` | `E_Anger` | Eye | Vertex | — |
| 38 | `キリッ右` | `E_Anger` | Eye | Vertex | — |
| 39 | `たれ目` | `E_Focus` | Eye | Vertex | — |
| 40 | `たれ目左` | `E_Focus` | Eye | Vertex | — |
| 41 | `たれ目右` | `E_Focus` | Eye | Vertex | — |
| 42 | `笑い目` | `E_Blephar` | Eye | Vertex | — |
| 43 | `笑い目左` | `E_Blephar` | Eye | Vertex | — |
| 44 | `笑い目右` | `E_Blephar` | Eye | Vertex | — |
| 45 | `悲しい目` | `E_Sad` | Eye | Vertex | — |
| 46 | `悲しい目左` | `E_Sad` | Eye | Vertex | — |
| 47 | `悲しい目右` | `E_Sad` | Eye | Vertex | — |
| 48 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 49 | `瞳小左` | `Pupil_Scale` | Eye | Vertex | — |
| 50 | `瞳小右` | `Pupil_Scale` | Eye | Vertex | — |
| 51 | `ハイライト消` | — | Eye | Vertex | — |
| 52 | `ハイライト消左` | — | Eye | Vertex | — |
| 53 | `ハイライト消右` | — | Eye | Vertex | — |
| 54 | `恐ろしい子！` | — | Eye | Vertex | — |
| 55 | `恐ろしい子！左` | — | Eye | Vertex | — |
| 56 | `恐ろしい子！右` | — | Eye | Vertex | — |
| 57 | `カメラ目` | — | Eye | Vertex | — |
| 58 | `Up` | `Pupil_Up` | Eye | Vertex | — |
| 59 | `Down` | `Pupil_Down` | Eye | Vertex | — |
| 60 | `Right` | `Pupil_R` | Eye | Vertex | — |
| 61 | `Left` | `Pupil_L` | Eye | Vertex | — |
| 62 | `あ` | `A` | Lip | Vertex | a |
| 63 | `あ２` | `Aa` | Lip | Vertex | — |
| 64 | `ああ` | `M_Trapezoid` | Lip | Vertex | — |
| 65 | `い` | `I` | Lip | Vertex | i |
| 66 | `い２` | `M_ScaredTooth` | Lip | Vertex | — |
| 67 | `う` | `U` | Lip | Vertex | u |
| 68 | `うう` | `S_01` | Lip | Vertex | — |
| 69 | `う２` | `M_OpenSmall` | Lip | Vertex | — |
| 70 | `え` | `E` | Lip | Vertex | e |
| 71 | `お` | `O` | Lip | Vertex | o |
| 72 | `お２` | `M_O` | Lip | Vertex | — |
| 73 | `ワ` | `M_Laugh` | Lip | Vertex | — |
| 74 | `ん` | `M_Anger` | Lip | Vertex | — |
| 75 | `ん２` | `C_M_Distant` | Lip | Vertex | — |
| 76 | `∧` | `M_Nutcracker` | Lip | Vertex | — |
| 77 | `□` | `M_A` | Lip | Vertex | — |
| 78 | `なんで` | `M_Scared` | Lip | Vertex | — |
| 79 | `てへぺろ ` | `S_02` | Lip | Vertex | — |
| 80 | `口角下げ左` | `M_Ennui_L` | Lip | Vertex | — |
| 81 | `口角下げ右` | `M_Ennui_R` | Lip | Vertex | — |
| 82 | `口角上げ左` | `M_Smile_L` | Lip | Vertex | — |
| 83 | `口角上げ右` | `M_Smile_R` | Lip | Vertex | — |
| 84 | `口横広げ左` | `P_M_L_Add` | Lip | Vertex | — |
| 85 | `口横広げ右` | `P_M_R_Add` | Lip | Vertex | — |
| 86 | `口横広げ2右` | `P_M_ZR_Add` | Lip | Vertex | — |
| 87 | `口横広げ2左` | `P_M_ZL_Add` | Lip | Vertex | — |
| 88 | `口横縮小` | `P_M_Scale_Add` | Lip | Vertex | — |
| 89 | `齶右` | `C_ZR_Face` | Lip | Vertex | — |
| 90 | `齶左` | `C_ZL_Face` | Lip | Vertex | — |
| 91 | `齶前` | `C_Down_Face` | Lip | Vertex | — |
| 92 | `齶上` | `C_Up_Face` | Lip | Vertex | — |
| 93 | `鼻上` | `P_Nose_Up` | Lip | Vertex | — |
| 94 | `鼻下` | `P_Nose_Down` | Lip | Vertex | — |
| 95 | `口上` | `P_M_Up_Add` | Lip | Vertex | — |
| 96 | `口下` | `P_M_Down_Add` | Lip | Vertex | — |
| 97 | `口右` | `P_M_RMove_Add` | Lip | Vertex | — |
| 98 | `口左` | `P_M_LMove_Add` | Lip | Vertex | — |
| 99 | `唇中` | `P_M_MidPoint_Add` | Lip | Vertex | — |
| 100 | `口角前` | `P_M_UpDownView_Add` | Lip | Vertex | — |
| 101 | `FaceRed` | `FaceRed` | Other | Vertex | — |
| 102 | `#` | `#` | Other | Vertex | — |
| 103 | `#2` | `#2` | Other | Vertex | — |
| 104 | `？` | `？` | Other | Vertex | — |
| 105 | `！` | `！` | Other | Vertex | — |
| 106 | `ZZZ` | `ZZZ` | Other | Vertex | — |
| 107 | `汗` | `汗` | Other | Vertex | — |
| 108 | `はちゅ` | `はちゅ` | Other | Vertex | — |
| 109 | `惊` | `惊` | Other | Vertex | — |
| 110 | `……` | `……` | Other | Vertex | — |
| 111 | `星目` | `星目` | Other | Vertex | — |
| 112 | `星目2` | `星目2` | Other | Vertex | — |
| 113 | `はぁと` | `はぁと` | Other | Vertex | — |
| 114 | `はぁと2` | `はぁと2` | Other | Vertex | — |
| 115 | `照れ` | `照れ` | Other | Vertex | — |
| 116 | `照れ2` | `照れ2` | Other | Vertex | — |
| 117 | `涙` | `涙` | Other | Vertex | — |
| 118 | `黒化` | `黒化` | Other | Material | — |
| 119 | `白化` | `白化` | Other | Material | — |
| 120 | `透過` | `透過` | Other | Material | — |
| 121 | `轮廓线OFF` | — | Other | Material | — |
| 122 | `spa深` | — | Other | Material | — |
| 123 | `髪高光消` | — | Other | Material | — |

<a id="model-47"></a>
### 47. 尤诺

- Format: PMX
- Asset path: `ww/chars/Iuno/Iuno/Iuno.pmx`
- Embedded name: `尤诺`
- Embedded English name: `尤诺`
- Cache file: `84b618e365043d18074e67e7aa9f2a352771cb7a0cd92625d1c7b0e9ac0f3b22.asset`
- Morph counts: Eye: 14, Eyebrow: 11, Lip: 35, Other: 2; total: 62.
- Unmatched app channels: `smileEyes`, `smile`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `怒り` | `B_Anger` | Eyebrow | Vertex | angry |
| 1 | `にこり` | `B_Happy` | Eyebrow | Vertex | — |
| 2 | `にこり２` | `B_Cheerful` | Eyebrow | Vertex | — |
| 3 | `困る` | `B_Sad` | Eyebrow | Vertex | sad |
| 4 | `困る１` | `S_02` | Eyebrow | Vertex | — |
| 5 | `平行` | `B_Flat` | Eyebrow | Vertex | — |
| 6 | `入` | `B_Inside_Add` | Eyebrow | Vertex | — |
| 7 | `疑惑 左` | `B_AH_R` | Eyebrow | Vertex | — |
| 8 | `疑惑 右` | `B_AH_L` | Eyebrow | Vertex | — |
| 9 | `上` | `B_Up_Add` | Eyebrow | Vertex | — |
| 10 | `下` | `B_Down_Add` | Eyebrow | Vertex | — |
| 11 | `まばたき` | `E_Close` | Eye | Vertex | blink |
| 12 | `ウィンク右` | `E_Smile_R` | Eye | Vertex | — |
| 13 | `ウィンク` | `E_Smile_L` | Eye | Vertex | — |
| 14 | `目右` | `Pupil_R` | Eye | Vertex | — |
| 15 | `目左` | `Pupil_L` | Eye | Vertex | — |
| 16 | `目上` | `Pupil_Up` | Eye | Vertex | — |
| 17 | `目下` | `Pupil_Down` | Eye | Vertex | — |
| 18 | `瞳小` | `Pupil_Scale` | Eye | Vertex | — |
| 19 | `びっくり` | `E_Stare` | Eye | Vertex | surprised |
| 20 | `キリッ` | `E_Anger` | Eye | Vertex | — |
| 21 | `悲しい目` | `E_Sad` | Eye | Vertex | — |
| 22 | `たれ目` | `E_Focus` | Eye | Vertex | — |
| 23 | `じと目` | `E_Insipid` | Eye | Vertex | — |
| 24 | `笑い目` | `E_Blephar` | Eye | Vertex | — |
| 25 | `あ` | `Aa` | Lip | Vertex | a |
| 26 | `ああ` | `M_Trapezoid` | Lip | Vertex | — |
| 27 | `え` | `E` | Lip | Vertex | e |
| 28 | `い` | `I` | Lip | Vertex | i |
| 29 | `お` | `O` | Lip | Vertex | o |
| 30 | `お２` | `M_O` | Lip | Vertex | — |
| 31 | `う` | `U` | Lip | Vertex | u |
| 32 | `ワ` | `M_Laugh` | Lip | Vertex | — |
| 33 | `いい` | `S_01` | Lip | Vertex | — |
| 34 | `なんで` | `M_Scared` | Lip | Vertex | — |
| 35 | `い２` | `M_ScaredTooth` | Lip | Vertex | — |
| 36 | `ん` | `M_Anger` | Lip | Vertex | — |
| 37 | `□` | `M_A` | Lip | Vertex | — |
| 38 | `∧` | `M_Nutcracker` | Lip | Vertex | — |
| 39 | `う２` | `M_OpenSmall` | Lip | Vertex | — |
| 40 | `口角上げ右` | `M_Smile_R` | Lip | Vertex | — |
| 41 | `口角上げ左` | `M_Smile_L` | Lip | Vertex | — |
| 42 | `口角下げ右` | `M_Ennui_R` | Lip | Vertex | — |
| 43 | `口角下げ左` | `M_Ennui_L` | Lip | Vertex | — |
| 44 | `口横広げ右` | `P_M_R_Add` | Lip | Vertex | — |
| 45 | `口横広げ左` | `P_M_L_Add` | Lip | Vertex | — |
| 46 | `口横広げ2右` | `P_M_ZR_Add` | Lip | Vertex | — |
| 47 | `口横広げ2左` | `P_M_ZL_Add` | Lip | Vertex | — |
| 48 | `口横縮小` | `P_M_Scale_Add` | Lip | Vertex | — |
| 49 | `齶右` | `C_ZR_Face` | Lip | Vertex | — |
| 50 | `齶左` | `C_ZL_Face` | Lip | Vertex | — |
| 51 | `齶前` | `C_Down_Face` | Lip | Vertex | — |
| 52 | `齶上` | `C_Up_Face` | Lip | Vertex | — |
| 53 | `鼻上` | `P_Nose_Up` | Lip | Vertex | — |
| 54 | `鼻下` | `P_Nose_Down` | Lip | Vertex | — |
| 55 | `口上` | `P_M_Up_Add` | Lip | Vertex | — |
| 56 | `口下` | `P_M_Down_Add` | Lip | Vertex | — |
| 57 | `口右` | `P_M_RMove_Add` | Lip | Vertex | — |
| 58 | `口左` | `P_M_LMove_Add` | Lip | Vertex | — |
| 59 | `口角前` | `P_M_UpDownView_Add` | Lip | Vertex | — |
| 60 | `FaceRed` | `FaceRed` | Other | Material | — |
| 61 | `Shoes` | `Shoes` | Other | Material | — |

<a id="model-48"></a>
### 48. 景燃

- Format: PMX
- Asset path: `ww/chars/Jingran/Jingran.pmx`
- Embedded name: `景燃`
- Embedded English name: `景燃`
- Cache file: `dc753433d8a8db393b0176f9368c3e3fef336c380bf2ba1a20209434371bf5ea.asset`
- Morph counts: Eye: 44, Eyebrow: 27, Lip: 42, Other: 17; total: 130.
- Unmatched app channels: `smile`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `#` | `#` | Other | Vertex | — |
| 1 | `#2` | `#2` | Other | Vertex | — |
| 2 | `？` | `？` | Other | Vertex | — |
| 3 | `！` | `！` | Other | Vertex | — |
| 4 | `ZZZ` | `ZZZ` | Other | Vertex | — |
| 5 | `汗` | `汗` | Other | Vertex | — |
| 6 | `はちゅ` | `はちゅ` | Other | Vertex | — |
| 7 | `惊` | `惊` | Other | Vertex | — |
| 8 | `……` | `……` | Other | Vertex | — |
| 9 | `星目` | `星目` | Other | Vertex | — |
| 10 | `星目2` | `星目2` | Other | Vertex | — |
| 11 | `はぁと` | `はぁと` | Other | Vertex | — |
| 12 | `はぁと2` | `はぁと2` | Other | Vertex | — |
| 13 | `照れ` | `照れ` | Other | Vertex | — |
| 14 | `照れ2` | `照れ2` | Other | Vertex | — |
| 15 | `涙` | `涙` | Other | Vertex | — |
| 16 | `FaceRed` | `FaceRed` | Other | Vertex | — |
| 17 | `真面目` | `真面目` | Eyebrow | Vertex | — |
| 18 | `真面目左` | `真面目左` | Eyebrow | Vertex | — |
| 19 | `真面目右` | `真面目右` | Eyebrow | Vertex | — |
| 20 | `困る` | `困る` | Eyebrow | Vertex | sad |
| 21 | `困る左` | `困る左` | Eyebrow | Vertex | — |
| 22 | `困る右` | `困る右` | Eyebrow | Vertex | — |
| 23 | `にこり` | `にこり` | Eyebrow | Vertex | — |
| 24 | `にこり左` | `にこり左` | Eyebrow | Vertex | — |
| 25 | `にこり右` | `にこり右` | Eyebrow | Vertex | — |
| 26 | `にこり２` | `にこり２` | Eyebrow | Vertex | — |
| 27 | `にこり２左` | `にこり２左` | Eyebrow | Vertex | — |
| 28 | `にこり２右` | `にこり２右` | Eyebrow | Vertex | — |
| 29 | `怒り` | `怒り` | Eyebrow | Vertex | angry |
| 30 | `怒り左` | `怒り左` | Eyebrow | Vertex | — |
| 31 | `怒り右` | `怒り右` | Eyebrow | Vertex | — |
| 32 | `上` | `上` | Eyebrow | Vertex | — |
| 33 | `上左` | `上左` | Eyebrow | Vertex | — |
| 34 | `上右` | `上右` | Eyebrow | Vertex | — |
| 35 | `下` | `下` | Eyebrow | Vertex | — |
| 36 | `下左` | `下左` | Eyebrow | Vertex | — |
| 37 | `下右` | `下右` | Eyebrow | Vertex | — |
| 38 | `平行` | `平行` | Eyebrow | Vertex | — |
| 39 | `平行左` | `平行左` | Eyebrow | Vertex | — |
| 40 | `平行右` | `平行右` | Eyebrow | Vertex | — |
| 41 | `入` | `入` | Eyebrow | Vertex | — |
| 42 | `入左` | `入左` | Eyebrow | Vertex | — |
| 43 | `入右` | `入右` | Eyebrow | Vertex | — |
| 44 | `まばたき` | `まばたき` | Eye | Vertex | blink |
| 45 | `ウィンク２` | `ウィンク２` | Eye | Vertex | — |
| 46 | `ウィンク２右` | `ウィンク２右` | Eye | Vertex | — |
| 47 | `笑い` | `笑い` | Eye | Vertex | smileEyes |
| 48 | `笑い目+右` | `笑い目+右` | Eye | Vertex | — |
| 49 | `笑い目+左` | `笑い目+左` | Eye | Vertex | — |
| 50 | `ウィンク` | `ウィンク` | Eye | Vertex | — |
| 51 | `ウィンク右` | `ウィンク右` | Eye | Vertex | — |
| 52 | `じと目` | `じと目` | Eye | Vertex | — |
| 53 | `じと目左` | `じと目左` | Eye | Vertex | — |
| 54 | `じと目右` | `じと目右` | Eye | Vertex | — |
| 55 | `びっくり` | `びっくり` | Eye | Vertex | surprised |
| 56 | `びっくり左` | `びっくり左` | Eye | Vertex | — |
| 57 | `びっくり右` | `びっくり右` | Eye | Vertex | — |
| 58 | `キリッ` | `キリッ` | Eye | Vertex | — |
| 59 | `キリッ左` | `キリッ左` | Eye | Vertex | — |
| 60 | `キリッ右` | `キリッ右` | Eye | Vertex | — |
| 61 | `たれ目` | `たれ目` | Eye | Vertex | — |
| 62 | `たれ目左` | `たれ目左` | Eye | Vertex | — |
| 63 | `たれ目右` | `たれ目右` | Eye | Vertex | — |
| 64 | `笑い目` | `笑い目` | Eye | Vertex | — |
| 65 | `笑い目左` | `笑い目左` | Eye | Vertex | — |
| 66 | `笑い目右` | `笑い目右` | Eye | Vertex | — |
| 67 | `悲しい目` | `悲しい目` | Eye | Vertex | — |
| 68 | `悲しい目左` | `悲しい目左` | Eye | Vertex | — |
| 69 | `悲しい目右` | `悲しい目右` | Eye | Vertex | — |
| 70 | `瞳小` | `瞳小` | Eye | Vertex | — |
| 71 | `瞳小左` | `瞳小左` | Eye | Vertex | — |
| 72 | `瞳小右` | `瞳小右` | Eye | Vertex | — |
| 73 | `恐ろしい子！` | `恐ろしい子！` | Eye | Vertex | — |
| 74 | `カメラ目` | `カメラ目` | Eye | Vertex | — |
| 75 | `ハイライト消し` | `ハイライト消し` | Eye | Vertex | — |
| 76 | `Up` | `Up` | Eye | Vertex | — |
| 77 | `Down` | `Down` | Eye | Vertex | — |
| 78 | `Right` | `Right` | Eye | Vertex | — |
| 79 | `Left` | `Left` | Eye | Vertex | — |
| 80 | `Up_R` | `Up_R` | Eye | Vertex | — |
| 81 | `Up_L` | `Up_L` | Eye | Vertex | — |
| 82 | `Down_R` | `Down_R` | Eye | Vertex | — |
| 83 | `Down_L` | `Down_L` | Eye | Vertex | — |
| 84 | `In_R` | `In_R` | Eye | Vertex | — |
| 85 | `In_L` | `In_L` | Eye | Vertex | — |
| 86 | `Out_R` | `Out_R` | Eye | Vertex | — |
| 87 | `Out_L` | `Out_L` | Eye | Vertex | — |
| 88 | `あ` | `あ` | Lip | Vertex | a |
| 89 | `あ２` | `あ２` | Lip | Vertex | — |
| 90 | `ああ` | `ああ` | Lip | Vertex | — |
| 91 | `い` | `い` | Lip | Vertex | i |
| 92 | `い２` | `い２` | Lip | Vertex | — |
| 93 | `う` | `う` | Lip | Vertex | u |
| 94 | `う２` | `う２` | Lip | Vertex | — |
| 95 | `え` | `え` | Lip | Vertex | e |
| 96 | `お` | `お` | Lip | Vertex | o |
| 97 | `お２` | `お２` | Lip | Vertex | — |
| 98 | `ワ` | `ワ` | Lip | Vertex | — |
| 99 | `ん` | `ん` | Lip | Vertex | — |
| 100 | `ん２` | `ん２` | Lip | Vertex | — |
| 101 | `∧` | `∧` | Lip | Vertex | — |
| 102 | `□` | `□` | Lip | Vertex | — |
| 103 | `なんで` | `なんで` | Lip | Vertex | — |
| 104 | `口横狭げ` | `口横狭げ` | Lip | Vertex | — |
| 105 | `口角下げ左` | `口角下げ左` | Lip | Vertex | — |
| 106 | `口角下げ右` | `口角下げ右` | Lip | Vertex | — |
| 107 | `口角上げ左` | `口角上げ左` | Lip | Vertex | — |
| 108 | `口角上げ右` | `口角上げ右` | Lip | Vertex | — |
| 109 | `口角上げ2右` | `口角上げ2右` | Lip | Vertex | — |
| 110 | `口角上げ2左` | `口角上げ2左` | Lip | Vertex | — |
| 111 | `口横広げ左` | `口横広げ左` | Lip | Vertex | — |
| 112 | `口横広げ右` | `口横広げ右` | Lip | Vertex | — |
| 113 | `口横狭げ左` | `口横狭げ左` | Lip | Vertex | — |
| 114 | `口横狭げ右` | `口横狭げ右` | Lip | Vertex | — |
| 115 | `口横広げ2右` | `口横広げ2右` | Lip | Vertex | — |
| 116 | `口横広げ2左` | `口横広げ2左` | Lip | Vertex | — |
| 117 | `頬を膨` | `頬を膨` | Lip | Vertex | — |
| 118 | `齶右` | `齶右` | Lip | Vertex | — |
| 119 | `齶左` | `齶左` | Lip | Vertex | — |
| 120 | `齶前` | `齶前` | Lip | Vertex | — |
| 121 | `齶上` | `齶上` | Lip | Vertex | — |
| 122 | `鼻上` | `鼻上` | Lip | Vertex | — |
| 123 | `鼻下` | `鼻下` | Lip | Vertex | — |
| 124 | `口上` | `口上` | Lip | Vertex | — |
| 125 | `口下` | `口下` | Lip | Vertex | — |
| 126 | `口右` | `口右` | Lip | Vertex | — |
| 127 | `口左` | `口左` | Lip | Vertex | — |
| 128 | `唇中` | `唇中` | Lip | Vertex | — |
| 129 | `口角前` | `口角前` | Lip | Vertex | — |

<a id="model-49"></a>
### 49. 莫宁

- Format: PMX
- Asset path: `ww/chars/Mornye/Mornye/Mornye.pmx`
- Embedded name: `莫宁`
- Embedded English name: `莫宁`
- Cache file: `8815aacaa5f9e95e9b5d57b4edaa9be18c0351f0507c0ec4619782744887048e.asset`
- Morph counts: Eye: 38, Eyebrow: 24, Lip: 37, Other: 18; total: 117.
- Unmatched app channels: `smile`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `OFclipping` | — | Other | Bone | — |
| 1 | `困る` | `困る` | Eyebrow | Vertex | sad |
| 2 | `困る左` | — | Eyebrow | Vertex | — |
| 3 | `困る右` | — | Eyebrow | Vertex | — |
| 4 | `にこり` | `にこり` | Eyebrow | Vertex | — |
| 5 | `にこり左` | — | Eyebrow | Vertex | — |
| 6 | `にこり右` | — | Eyebrow | Vertex | — |
| 7 | `にこり２` | `にこり２` | Eyebrow | Vertex | — |
| 8 | `にこり２右` | — | Eyebrow | Vertex | — |
| 9 | `にこり２左` | — | Eyebrow | Vertex | — |
| 10 | `怒り` | `怒り` | Eyebrow | Vertex | angry |
| 11 | `怒り左` | `怒り左` | Eyebrow | Vertex | — |
| 12 | `怒り右` | `怒り右` | Eyebrow | Vertex | — |
| 13 | `上` | `上` | Eyebrow | Vertex | — |
| 14 | `上左` | — | Eyebrow | Vertex | — |
| 15 | `上右` | — | Eyebrow | Vertex | — |
| 16 | `下` | `下` | Eyebrow | Vertex | — |
| 17 | `下左` | — | Eyebrow | Vertex | — |
| 18 | `下右` | — | Eyebrow | Vertex | — |
| 19 | `平行` | `平行` | Eyebrow | Vertex | — |
| 20 | `平行左` | — | Eyebrow | Vertex | — |
| 21 | `平行右` | — | Eyebrow | Vertex | — |
| 22 | `入` | `入` | Eyebrow | Vertex | — |
| 23 | `入左` | — | Eyebrow | Vertex | — |
| 24 | `入右` | — | Eyebrow | Vertex | — |
| 25 | `まばたき` | `まばたき` | Eye | Vertex | blink |
| 26 | `ウィンク2` | — | Eye | Vertex | — |
| 27 | `ウィンク2右` | — | Eye | Vertex | — |
| 28 | `笑い` | — | Eye | Vertex | smileEyes |
| 29 | `ウィンク` | `ウィンク` | Eye | Vertex | — |
| 30 | `ウィンク右` | `ウィンク右` | Eye | Vertex | — |
| 31 | `じと目` | `じと目` | Eye | Vertex | — |
| 32 | `じと目左` | — | Eye | Vertex | — |
| 33 | `じと目右` | — | Eye | Vertex | — |
| 34 | `びっくり` | `びっくり` | Eye | Vertex | surprised |
| 35 | `びっくり左` | — | Eye | Vertex | — |
| 36 | `びっくり右` | — | Eye | Vertex | — |
| 37 | `キリッ` | `キリッ` | Eye | Vertex | — |
| 38 | `キリッ左` | — | Eye | Vertex | — |
| 39 | `キリッ右` | — | Eye | Vertex | — |
| 40 | `たれ目` | `たれ目` | Eye | Vertex | — |
| 41 | `たれ目左` | — | Eye | Vertex | — |
| 42 | `たれ目右` | — | Eye | Vertex | — |
| 43 | `笑い目` | `笑い目` | Eye | Vertex | — |
| 44 | `笑い目左` | — | Eye | Vertex | — |
| 45 | `笑い目右` | — | Eye | Vertex | — |
| 46 | `悲しい目` | `悲しい目` | Eye | Vertex | — |
| 47 | `悲しい目左` | — | Eye | Vertex | — |
| 48 | `悲しい目右` | — | Eye | Vertex | — |
| 49 | `瞳小` | `瞳小` | Eye | Vertex | — |
| 50 | `瞳小左` | — | Eye | Vertex | — |
| 51 | `瞳小右` | — | Eye | Vertex | — |
| 52 | `恐ろしい子！` | `恐ろしい子！` | Eye | Vertex | — |
| 53 | `恐ろしい子！左` | — | Eye | Vertex | — |
| 54 | `恐ろしい子！右` | — | Eye | Vertex | — |
| 55 | `ハイライト消し右` | — | Eye | Vertex | — |
| 56 | `ハイライト消し左` | — | Eye | Vertex | — |
| 57 | `ハイライト消し` | `ハイライト消し` | Eye | Vertex | — |
| 58 | `カメラ目` | `カメラ目` | Eye | Vertex | — |
| 59 | `Up` | `Up` | Eye | Vertex | — |
| 60 | `Down` | `Down` | Eye | Vertex | — |
| 61 | `Right` | `Right` | Eye | Vertex | — |
| 62 | `Left` | `Left` | Eye | Vertex | — |
| 63 | `あ` | `あ` | Lip | Vertex | a |
| 64 | `あ２` | `あ２` | Lip | Vertex | — |
| 65 | `ああ` | `ああ` | Lip | Vertex | — |
| 66 | `い` | `い` | Lip | Vertex | i |
| 67 | `い２` | `い２` | Lip | Vertex | — |
| 68 | `う` | `う` | Lip | Vertex | u |
| 69 | `う２` | `う２` | Lip | Vertex | — |
| 70 | `え` | `え` | Lip | Vertex | e |
| 71 | `お` | `お` | Lip | Vertex | o |
| 72 | `お２` | `お２` | Lip | Vertex | — |
| 73 | `ワ` | `ワ` | Lip | Vertex | — |
| 74 | `ん` | `ん` | Lip | Vertex | — |
| 75 | `ん２` | `ん２` | Lip | Vertex | — |
| 76 | `∧` | `∧` | Lip | Vertex | — |
| 77 | `□` | `□` | Lip | Vertex | — |
| 78 | `なんで` | `なんで` | Lip | Vertex | — |
| 79 | `口角下げ左` | `口角下げ左` | Lip | Vertex | — |
| 80 | `口角下げ右` | `口角下げ右` | Lip | Vertex | — |
| 81 | `口角上げ左` | `口角上げ左` | Lip | Vertex | — |
| 82 | `口角上げ右` | `口角上げ右` | Lip | Vertex | — |
| 83 | `口横広げ左` | `口横広げ左` | Lip | Vertex | — |
| 84 | `口横広げ右` | `口横広げ右` | Lip | Vertex | — |
| 85 | `口横広げ2右` | `口横広げ2右` | Lip | Vertex | — |
| 86 | `口横広げ2左` | `口横広げ2左` | Lip | Vertex | — |
| 87 | `口横縮小` | `口横縮小` | Lip | Vertex | — |
| 88 | `齶右` | `齶右` | Lip | Vertex | — |
| 89 | `齶左` | `齶左` | Lip | Vertex | — |
| 90 | `齶前` | `齶前` | Lip | Vertex | — |
| 91 | `齶上` | `齶上` | Lip | Vertex | — |
| 92 | `鼻上` | `鼻上` | Lip | Vertex | — |
| 93 | `鼻下` | `鼻下` | Lip | Vertex | — |
| 94 | `口上` | `口上` | Lip | Vertex | — |
| 95 | `口下` | `口下` | Lip | Vertex | — |
| 96 | `口右` | `口右` | Lip | Vertex | — |
| 97 | `口左` | `口左` | Lip | Vertex | — |
| 98 | `唇中` | `唇中` | Lip | Vertex | — |
| 99 | `口角前` | `口角前` | Lip | Vertex | — |
| 100 | `#` | `#` | Other | Vertex | — |
| 101 | `#2` | `#2` | Other | Vertex | — |
| 102 | `？` | `？` | Other | Vertex | — |
| 103 | `！` | `！` | Other | Vertex | — |
| 104 | `ZZZ` | `ZZZ` | Other | Vertex | — |
| 105 | `汗` | `汗` | Other | Vertex | — |
| 106 | `はちゅ` | `はちゅ` | Other | Vertex | — |
| 107 | `惊` | `惊` | Other | Vertex | — |
| 108 | `……` | `……` | Other | Vertex | — |
| 109 | `星目` | `星目` | Other | Vertex | — |
| 110 | `星目2` | `星目2` | Other | Vertex | — |
| 111 | `はぁと` | `はぁと` | Other | Vertex | — |
| 112 | `はぁと2` | `はぁと2` | Other | Vertex | — |
| 113 | `照れ` | `照れ` | Other | Vertex | — |
| 114 | `照れ2` | `照れ2` | Other | Vertex | — |
| 115 | `涙` | `涙` | Other | Vertex | — |
| 116 | `FaceRed` | `FaceRed` | Other | Vertex | — |

<a id="model-50"></a>
### 50. 薄荷宿舍

- Format: PMX
- Asset path: `nte/chars/Mint/Mint_loungewear/Mint.pmx`
- Embedded name: `薄荷宿舍`
- Embedded English name: —
- Cache file: `5a517c6f7186c34261f1a1d9bbb6f63758328ff26491322de01712d7de0804bc.asset`
- Morph counts: Eye: 6, Eyebrow: 7, Lip: 10, Other: 19; total: 42.
- Unmatched app channels: `smile`.

| Index | Exact morph key | Author English name | Category | Type | App channel |
|---:|---|---|---|---|---|
| 0 | `大胸` | — | Other | Vertex | — |
| 1 | `小胸` | — | Other | Vertex | — |
| 2 | `びっくり` | — | Other | Vertex | surprised |
| 3 | `哀目` | — | Other | Vertex | — |
| 4 | `にこり` | — | Other | Vertex | — |
| 5 | `真面目` | — | Other | Vertex | — |
| 6 | `▲` | — | Lip | Vertex | — |
| 7 | `ω` | — | Lip | Vertex | — |
| 8 | `ω□` | — | Lip | Vertex | — |
| 9 | `口角下げ` | — | Lip | Vertex | — |
| 10 | `ぺろっ` | — | Other | Vertex | — |
| 11 | `键 24` | — | Other | Vertex | — |
| 12 | `汗` | — | Other | Vertex | — |
| 13 | `悪い目` | — | Other | Vertex | — |
| 14 | `はちゅ目` | — | Other | Vertex | — |
| 15 | `はぅ` | — | Other | Vertex | — |
| 16 | `なごみ` | — | Other | Vertex | — |
| 17 | `星目` | — | Other | Vertex | — |
| 18 | `はぁと` | — | Other | Vertex | — |
| 19 | `照れ` | — | Other | Vertex | — |
| 20 | `惊` | — | Other | Vertex | — |
| 21 | `涙` | — | Other | Vertex | — |
| 22 | `#` | — | Other | Vertex | — |
| 23 | `瞳小` | — | Eye | Vertex | — |
| 24 | `瞳縦潰れ` | — | Eye | Vertex | — |
| 25 | `恐ろしい子！` | — | Eye | Vertex | — |
| 26 | `ハイライト消` | — | Eye | Vertex | — |
| 27 | `口角上げ` | — | Lip | Vertex | — |
| 28 | `まばたき` | — | Eye | Vertex | blink |
| 29 | `上` | — | Eyebrow | Vertex | — |
| 30 | `下` | — | Eyebrow | Vertex | — |
| 31 | `困る` | — | Eyebrow | Vertex | sad |
| 32 | `怒り` | — | Eyebrow | Vertex | angry |
| 33 | `笑い` | — | Eyebrow | Vertex | smileEyes |
| 34 | `じと目` | — | Eyebrow | Vertex | — |
| 35 | `怒り目` | — | Eyebrow | Vertex | — |
| 36 | `あ` | — | Lip | Vertex | a |
| 37 | `い` | — | Lip | Vertex | i |
| 38 | `う` | — | Lip | Vertex | u |
| 39 | `え` | — | Lip | Vertex | e |
| 40 | `お` | — | Lip | Vertex | o |
| 41 | `脱外套` | — | Eye | Material | — |

## Extraction and verification

Binary models were read from `~/Library/Application Support/Mighty Chat/Character Assets`. File signatures were checked instead of relying on the cache’s `.asset` extension. The installed `babylon-mmd` PMX/BPMX readers parsed each complete binary without loading textures, rendering models or making network requests. Cache manifests and the bundled appearance catalog were used to recover source paths; catalog matches use the same SHA-256 path-to-cache naming as `CharacterCache.cjs`.

Validation checks: 50/50 model parses succeeded; every parsed morph is included exactly once in its model table; indices are sequential from zero within each model; all facial-category entries are represented in the combined index; channel selection follows the reviewed adapter’s current matching rules. No visual activation/calibration test was performed.
