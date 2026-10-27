/* The shipped roster is fixed. Remote catalogs must never expand it. */
(function(root) {
  'use strict';
  const appearances = [
  {
    "key": "ww/chars/Lynae/Lynae/Lynae.pmx",
    "name": "Lynae",
    "group": "Wuthering Waves",
    "variant": false,
    "directory": "ww/chars/Lynae/Lynae",
    "file": "Lynae.pmx",
    "portrait": "https://phoshco.github.io/ww/WuWa/Lynae.png"
  },
  {
    "key": "ww/chars/Lynae/Lynae_Solar5/Lynae.pmx",
    "name": "Lynae",
    "group": "Wuthering Waves",
    "variant": true,
    "directory": "ww/chars/Lynae/Lynae_Solar5",
    "file": "Lynae.pmx",
    "portrait": "https://phoshco.github.io/ww/WuWa/Lynae.png"
  },
  {
    "key": "ww/chars/Lynae/Lynae_skin/Lynae.pmx",
    "name": "Lynae",
    "group": "Wuthering Waves",
    "variant": true,
    "directory": "ww/chars/Lynae/Lynae_skin",
    "file": "Lynae.pmx",
    "portrait": "https://phoshco.github.io/ww/WuWa/Lynae.png"
  },
  {
    "key": "ww/chars/Lucy/Lucy.pmx",
    "name": "Lucy",
    "group": "Wuthering Waves",
    "variant": false,
    "directory": "ww/chars/Lucy",
    "file": "Lucy.pmx",
    "portrait": "https://phoshco.github.io/ww/WuWa/Lucy.png"
  },
  {
    "key": "zzz/chars/Evelyn Chevalier/Evelyn.pmx",
    "name": "Evelyn",
    "group": "Zenless Zone Zero",
    "variant": false,
    "directory": "zzz/chars/Evelyn Chevalier",
    "file": "Evelyn.pmx",
    "portrait": "https://phoshco.github.io/zzz/ZZZ/Evelyn Chevalier.png"
  },
  {
    "key": "ww/chars/Rover (Female)/Rover (Female)/Rover (Female).pmx",
    "name": "Rover (Female)",
    "group": "Wuthering Waves",
    "variant": false,
    "directory": "ww/chars/Rover (Female)/Rover (Female)",
    "file": "Rover (Female).pmx",
    "portrait": "https://phoshco.github.io/ww/WuWa/Rover (Female).png"
  },
  {
    "key": "ww/chars/Rover (Female)/Skin/Rover (Female).pmx",
    "name": "Rover (Female)",
    "group": "Wuthering Waves",
    "variant": true,
    "directory": "ww/chars/Rover (Female)/Skin",
    "file": "Rover (Female).pmx",
    "portrait": "https://phoshco.github.io/ww/WuWa/Rover (Female).png"
  },
  {
    "key": "ww/chars/Rover (Male)/Rover (Male)/Rover (Male).bpmx",
    "name": "Rover (Male)",
    "group": "Wuthering Waves",
    "variant": false,
    "directory": "ww/chars/Rover (Male)/Rover (Male)",
    "file": "Rover (Male).bpmx",
    "portrait": "https://phoshco.github.io/ww/WuWa/Rover (Male).png"
  },
  {
    "key": "ww/chars/Rover (Male)/Skin/Rover (Male).pmx",
    "name": "Rover (Male)",
    "group": "Wuthering Waves",
    "variant": true,
    "directory": "ww/chars/Rover (Male)/Skin",
    "file": "Rover (Male).pmx",
    "portrait": "https://phoshco.github.io/ww/WuWa/Rover (Male).png"
  },
  {
    "key": "local/chars/hailey/hailey.glb",
    "name": "Hailey",
    "group": "The First Descendant",
    "variant": false,
    "directory": "local/chars/hailey",
    "file": "hailey.glb",
    "portrait": "local/chars/hailey/portrait.jpeg"
  }
];
  // Saved profiles may still use the former model paths for these same characters.
  const legacyAppearances = [
  {
    "key": "ww/chars/Rover (Female)/Rover (Female).pmx",
    "name": "Rover (Female)",
    "group": "Wuthering Waves",
    "variant": false,
    "directory": "ww/chars/Rover (Female)",
    "file": "Rover (Female).pmx",
    "portrait": "https://phoshco.github.io/ww/WuWa/Rover (Female).png"
  },
  {
    "key": "ww/chars/Rover (Male)/Rover (Male).bpmx",
    "name": "Rover (Male)",
    "group": "Wuthering Waves",
    "variant": false,
    "directory": "ww/chars/Rover (Male)",
    "file": "Rover (Male).bpmx",
    "portrait": "https://phoshco.github.io/ww/WuWa/Rover (Male).png"
  }
];
  const all = [...appearances, ...legacyAppearances];
  const byKey = new Map(all.map(item => [item.key, item]));
  function resolve(value) {
    if (!value || typeof value.directory !== 'string' || typeof value.file !== 'string') return null;
    const item = byKey.get(value.directory + '/' + value.file);
    return item && (!value.key || value.key === item.key) ? item : null;
  }
  function validAppearance(value) {
    const item = resolve(value);
    return !!item && value.key === item.key && value.name === item.name;
  }
  for (const item of all) Object.freeze(item);
  const roster = Object.freeze({appearances:Object.freeze(appearances),legacyAppearances:Object.freeze(legacyAppearances),resolve,validAppearance});
  if (typeof module === 'object' && module.exports) module.exports = roster;
  if (root) { root.MIGHTY_ROSTER = roster; root.MIGHTY_APPEARANCES = appearances.filter(item => item.name !== "Hailey"); }
})(typeof window === 'object' ? window : null);
