# « Une tâche, quatre gestes » — L’agence Switch

Vidéo de motion design pour LinkedIn, conçue pour être lue sans le son.

- **Format** : 1080 × 1350 (4:5), 30 i/s, 27 s (810 images), H.264 yuv420p BT.709, sans piste audio.
- **Fichier livré** : `out/switch-une-tache-quatre-gestes.mp4`
- **Vignette** (image 0) : `out/switch-une-tache-quatre-gestes-vignette.png`
- **Planche contact** : `out/planche.png`
- **Contrôle des règles** : `out/qa.md`

## Déroulé

| Temps | Plan | À l’écran |
|---|---|---|
| 0–2,5 s | 1 | « ChatGPT. » « Copilot. » « Mistral. » déjà visibles à l’image 0, ils se dédoublent nerveusement. Puis « Chacun le sien. » |
| 2,5–5 s | 2 | Les trois mots éclatent en 30 étiquettes d’usages. « Personne ne mesure / ce qui marche. » |
| 5–8 s | 3 | Les étiquettes sont aspirées vers l’humain central, le symbole se forme (humain, anneau, quatre grands nœuds). « Appel d’offres » reste seule, en surbrillance. « L’agence Switch / commence par / votre métier. » |
| 8–11,5 s | 4 | Zoom dans un nœud. « Cadrer. » « Savoir ce qui marche. » L’étiquette se pose sur le cadre en verre de la fiche SWITCHSCOPE. |
| 11,5–15 s | 5 | Zoom dans un nœud. « Former. » « Sur votre métier, / pas l’outil. » L’étiquette se pose sur le livret Switch School. |
| 15–18,5 s | 6 | Zoom dans un nœud. « Déployer. » « Du pilote / à la production. » Schéma en verre : l’étiquette et un avatar, puis une rangée d’avatars. |
| 18,5–22 s | 7 | Zoom dans un nœud. « Renforcer. » « La bonne compétence, / au bon moment. » Photo en bichromie bleue, l’étiquette vient contre elle. |
| 22–27 s | 9 | Le symbole se complète (quatre petits nœuds), logotype, « L’IA, du potentiel / au ROI mesurable. », « agenceswitch.ai ». Image immobile de 24 s à 27 s, coupe franche. |

Les quatre grands nœuds du logo portent les quatre gestes, dans le sens horaire. Les quatre petits nœuds n’apparaissent qu’au carton final.

## Visuels

Les fichiers sont lus dans `assets/`. Si un fichier est absent, un cadre en verre neutre marqué `[VISUEL À FOURNIR]` le remplace. Aucune image n’est inventée.

| Fichier attendu | État | Origine |
|---|---|---|
| `logo-switch-wordmark.png` | présent | Mot-symbole « switch / AGENCE AIAA », extrait du logo officiel embarqué dans le livret *Module 5* (Drive). |
| `logo-switch-symbole.svg` | présent | Symbole vectorisé à partir du même logo, superposé au PNG pour vérifier le tracé. Un élément par nœud. |
| `livret-switch-school.png` | présent | Recadrage de la couverture réelle du livret *Module 5 — Connecter vos documents* (Drive). |
| `switchscope-fragment.png` | **à fournir** | Format conseillé : ≈ 1360 × 1320 px (le cadre est cadré en haut). |
| `photo-equipe.jpg` | **à fournir** | Portrait vertical, ≈ 1000 × 1300 px. La bichromie bleue est appliquée au rendu (filtre `#duo`). |

Pour intégrer un visuel : déposer le fichier sous ce nom exact dans `assets/`, puis relancer le rendu et le contrôle. Si la personne n’est pas centrée sur la photo, ajuster `HERO.p7` dans `index.html` pour garder l’étiquette contre elle. Si un vrai `logo-switch.svg` est fourni, ses nœuds peuvent remplacer les constantes `SYM` (mêmes rôles : anneau, humain, liens, nœuds).

## Rendu

Prérequis : Node 18+, Playwright (Chromium) et ffmpeg avec libx264.

```bash
npm install            # ou NODE_PATH=$(npm root -g) si Playwright est installé globalement
npm run render         # → out/*.mp4 + vignette (≈ 4 min)
npm run qa             # contrôle des règles → out/qa.md
npm run sheet          # planche contact
node render.cjs --stills 0,9.5,26   # images isolées dans out/stills/
```

La composition est une page HTML (`index.html`). `window.seek(t)` dessine l’image au temps `t` sans aucune animation CSS. Le rendu est donc déterministe, image par image.

## Règles du brief et vérification

`qa.cjs` relit les 810 images et vérifie :

- titres ≥ 81 px, autres textes ≥ 47 px ;
- chaque texte entre en 0,4 s maximum, puis reste immobile au moins 1,5 s (étiquette suivie comprise, à chaque déplacement) ;
- 7 mots maximum par écran hors carton final ;
- aucune image vide ;
- image immobile pendant les 2 dernières secondes.

Le comptage des 7 mots porte sur les titres. L’étiquette « Appel d’offres », les étiquettes d’usages du plan 2 et le repère `[VISUEL À FOURNIR]` sont des objets du storyboard ; ils sont comptés à part dans `out/qa.md`.

Les autres règles sont tenues par construction :

- apostrophe typographique, avec une espace fine avant un « i » (`.ap-i`, ex. « L’IA ») ;
- dégradé de la ligne 2 limité à #2F4B95 → #3B6FE0 ;
- étiquette suivie de taille et de couleur fixes (64 px, #2F4B95) ;
- aucune pastille, carte, pagination, bouton, frappe lettre à lettre, logo tiers, interface simulée, chiffre ou client inventé.

### Choix de réalisation

- **Typographie** : Playfair Display (licence OFL, `fonts/`), serif d’affichage à fort contraste avec une vraie italique. Le skill web Switch (une seule grotesque, sans italique) ne s’applique pas ici : ce brief vidéo demande explicitement une serif et une italique.
- **Zoom dans un nœud** : le nœud visé s’allume en disque de lumière, son contour et son lien s’effacent, avec un flou de mouvement réel (20 échantillons, obturateur 180°). Sans cela, le nœud agrandi avec son lien ressemblait à une loupe, puis à un cercle seul.
- **Surbrillance** de l’étiquette au plan 3 : une lueur bleue portée par les lettres. La couleur et la taille du texte ne changent pas.
- **Logotype** : le logo officiel se lit « switch / AGENCE AIAA ». C’est lui qui est utilisé, et non une composition « L’agence Switch ».
