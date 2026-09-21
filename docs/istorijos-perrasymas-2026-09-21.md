# Commit'ų atitikmenys po istorijos perrašymo (2026-09-21)

2026-09-21 iš git istorijos pašalinti keturi failai, gulėję `PP-protocol/Other/`: trys archyvai
su LITGRID protokolų ir pranešimų PDF failais ir atskiras protokolų PDF. Repozitorija vieša, tad
GitHub juos atiduodavo bet kam, nors svetainėje nuorodų į juos nebuvo ir nė vienas modulis jų
nenaudojo.

**Pasikeitė visų commit'ų identifikatoriai.** Modulių `PROJECT_CONTEXT.md` failuose ir užrašuose
minimi seni identifikatoriai nebeveikia. Commit'ų pranešimai, autorius ir datos nepakito, tad
commit'ą galima rasti pagal pranešimą: `git log --all --grep="teksto dalis"`.

**Pilna senų ir naujų atitikmenų lentelė (222 poros) čia NEĮDEDAMA sąmoningai.** Seni
identifikatoriai kol kas tebeveikia GitHub'e: perrašius istoriją objektai tampa nepasiekiami per
šakas, bet lieka pasiekiami pagal tikslų commit'o identifikatorių, kol GitHub atlieka savo
valymą. Paskelbta lentelė būtų paruoštas kelias prie tų pačių failų. Ji saugoma vietoje:
`~/Documents/g-procure-commit-map-2026-09-21.md`, o visa senoji istorija -
`~/Documents/g-procure-backup-2026-09-21.bundle`.

**Ką dar reikia padaryti:** paprašyti GitHub pagalbos tarnybos išvalyti nepasiekiamus objektus
(„please run garbage collection to purge unreachable objects and cached views"). Kai tai bus
patvirtinta, lentelę galima įdėti čia.

**Kas patikrinta perrašius.** Dabartinio turinio medis identiškas buvusiam (`2e9a781d`), tad
svetainė nepasikeitė nė per baitą; 16 atsitiktinių commit'ų porų skiriasi TIK tais keturiais
pašalintais failais; pašalinti 8 tušti „Perkrauti Pages paskelbima" commit'ai; `.git` sumažėjo
nuo 24 iki 13 MB.
