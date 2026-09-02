# SKRM – Admin-käyttäjähallinnan valmis pohja

Tämä paketti on **vain valmis frontend-pohja**. Se ei muuta GitHub-repositoriota eikä tee backend-, Prisma- tai migraatiomuutoksia.

Pohja on suunniteltu nykyisen `Larzmoi/skrm`-projektin rakennetta silmällä pitäen.

## Sisältö

- `AdminUserManagementTemplate.tsx`
  - käyttäjähaku
  - striimausoikeuden kytkin
  - mukautettu komissio-%
  - mukautettu komissiokatto
  - `3,0 % / 25 €` superuser-arvot yhdellä napilla
  - aktiivisen bannin näyttö
  - bannin luonti
  - bannin poisto
  - salasanan palautuslinkin lähetys
  - onnistumis-/virheviestit
  - responsiivinen layout
  - käyttää `useTheme()` + `C.xxx` -värejä
  - käyttää `useLang()` + `t.admin.*` -käännösavaimia
  - ei kovakoodattuja käyttöliittymätekstejä

## Miksi API-kutsut ovat stubbeja?

Koska pyysit nimenomaan pohjan etkä halua, että repoosi tehdään muutoksia.

Tiedostossa on neljä tarkoituksella erillistä funktiota:

```ts
searchUsers()
updateUser()
banUser()
removeBan()
sendPasswordReset()
```

Ne on tarkoitettu korvattaviksi nykyisen `adminApi`-olion kutsuilla.

Nykyisessä projektissa `frontend/lib/api.ts` sisältää jo:

```ts
adminApi.searchUsers(search)
adminApi.banUser(id, reason, days)
```

Joten olemassa olevat kaksi kutsua voidaan säilyttää sellaisenaan.

Uudet kutsut vastaavat suunniteltua APIa:

```text
PATCH  /admin/users/:id
DELETE /admin/users/:id/ban
POST   /admin/users/:id/send-password-reset
```

## Odotettu käyttäjäobjekti

Frontend odottaa `/admin/users`-haun palauttavan käyttäjälle:

```ts
{
  id: string
  name: string
  username: string
  email: string
  role: 'USER' | 'ADMIN'
  canStream: boolean
  customCommissionRate: number | null
  customCommissionCap: number | null
  activeBan: {
    id: string
    reason: string
    endsAt: string
  } | null
}
```

## Komissioarvot

Tyhjä kenttä tarkoittaa oletusarvoa:

- komissio: `3,5 %`
- katto: `35 €`

Superuser-nappi täyttää:

- `3,0 %`
- `25 €`

Frontend lähettää tyhjän kentän backendille arvona `null`, jolloin backend voi tulkita sen "käytä oletusta" -arvoksi.

## Integrointi nykyiseen admin-sivuun

Nykyinen `frontend/app/admin/page.tsx` sisältää jo välilehdet:

```text
Ilmiannot
Käyttäjät
```

ja nykyinen `UsersTab` tekee käyttäjähaun.

Suositeltu yhdistäminen:

1. Korvaa nykyinen `UsersTab` tällä `AdminUserManagementTemplate`-komponentilla.
2. Tai siirrä komponentin sisältö nykyisen `UsersTab`-funktion tilalle.
3. Säilytä nykyinen `AdminPage`-komponentti, Navbar, Footer ja auth-tarkistus.
4. Kytke stub-funktiot `adminApi`-kutsuihin.

## API-kytkentä

Esimerkiksi:

```ts
async function searchUsers(search: string) {
  return adminApi.searchUsers(search)
}

async function updateUser(id: string, data: {
  canStream?: boolean
  customCommissionRate?: number | null
  customCommissionCap?: number | null
}) {
  return adminApi.updateUser(id, data)
}

async function banUser(id: string, reason: string, days: number) {
  return adminApi.banUser(id, reason, days)
}

async function removeBan(id: string) {
  return adminApi.removeBan(id)
}

async function sendPasswordReset(id: string) {
  return adminApi.sendPasswordReset(id)
}
```

Tämä edellyttää vastaavien uusien metodien lisäämistä `adminApi`-olioon.

## i18n

Komponentti käyttää seuraavia uusia avaimia:

```text
admin.userManagementTitle
admin.userManagementSubtitle
admin.canStream
admin.commissionRate
admin.commissionCap
admin.setSuperuserValues
admin.saveUserSettings
admin.sendPasswordReset
admin.banStatus
admin.banned
admin.banUntil
admin.removeBan
admin.notBanned
admin.banReasonPlaceholder
admin.banDays
admin.ban
admin.loadingUsers
admin.noUsersFound
admin.userSettingsSaved
admin.userSettingsError
admin.banSuccess
admin.banError
admin.banRemoved
admin.passwordResetSent
admin.passwordResetError
```

Lisää nämä `fi.ts`, `en.ts` ja `sv.ts` -tiedostoihin nykyisen `admin`-osion sisään.

## Prisma/backend-yhdistämisen suunnitelma

Backendin puolella suunnitelma on:

### User

Lisätään:

```prisma
canStream              Boolean @default(false)
customCommissionRate   Float?
customCommissionCap    Float?
```

Nykyisessä skeemassa `PasswordResetToken` on jo olemassa, joten erillistä token-mallia ei tarvitse luoda uudelleen.

### Ban

Nykyinen malli käyttää:

```prisma
endsAt DateTime
```

Aktiivinen banni voidaan määritellä:

```ts
endsAt > new Date()
```

Bannin poistossa `endsAt` voidaan asettaa menneisyyteen.

### GET /admin/users

Palautetaan käyttäjän mukana:

```text
canStream
customCommissionRate
customCommissionCap
activeBan
```

`activeBan` haetaan uusimmasta aktiivisesta `Ban`-rivistä.

### PATCH /admin/users/:id

Body:

```json
{
  "canStream": true,
  "customCommissionRate": 3,
  "customCommissionCap": 25
}
```

Kaikki kentät ovat valinnaisia.

### DELETE /admin/users/:id/ban

Aktiivisen bannin `endsAt` asetetaan menneisyyteen.

### POST /admin/users/:id/send-password-reset

Käytetään projektin olemassa olevaa password-reset-token-flow'ta ja sähköpostipalvelua.

## Komission yhdistäminen

Nykyinen komission laskenta käyttää:

```ts
computeCommissionCents(priceEuros)
```

Se voidaan laajentaa esimerkiksi:

```ts
computeCommissionCents(
  priceEuros,
  customCommissionRate,
  customCommissionCap
)
```

Kun custom-arvoa ei ole:

```text
3,5 %
35 €
```

Kun käyttäjälle on asetettu:

```text
3,0 %
25 €
```

käytetään niitä.

Tärkeää: komission myyjäkohtaiset arvot pitää hakea ennen Paytrail-maksupyynnön muodostamista. Niitä ei pidä luottaa frontendiltä tuleviksi arvoiksi.

## Shows / striimausoikeus

`POST /shows` kannattaa tarkistaa ennen Show-rivin luomista:

```ts
const user = await prisma.user.findUnique({
  where: { id: req.user.id },
  select: { canStream: true },
})

if (!user?.canStream) {
  return res.status(403).json({
    error: 'Striimausoikeutta ei ole vielä myönnetty',
  })
}
```

Frontendin kytkin vaikuttaa siis oikeasti backendin authorization-päätökseen vasta tämän muutoksen jälkeen.

## Tärkeä turvallisuusraja

Admin-UI on vain käyttöliittymä.

Seuraavia asioita ei saa koskaan toteuttaa vain frontendin perusteella:

- striimausoikeus
- komission määrä
- bannin tila
- admin-oikeudet
- password reset -tokenit

Backendin pitää validoida kaikki nämä.

## Visuaalinen suunnittelu

Pohja noudattaa nykyisen SKRM:n admin-sivun tyyliä:

- inline styles
- `useTheme()`
- `C.surface`
- `C.cardBg`
- `C.border`
- `C.text`
- `C.textSub`
- `C.muted`
- `C.accent`
- `C.accentSolid`
- `C.accentText`
- `C.accentLight`
- `C.red`
- `C.warn`
- `C.warnLight`

Näin sama komponentti toimii sekä nykyisessä vaaleassa että tummassa teemassa.

## Huomio nykyisestä repositoriosta

Tarkistin ennen pohjan tekemistä reposi nykyisen admin-sivun, API-rakenteen, teeman sekä Prisma-skeeman.

Nykyinen admin-sivu käyttää jo `Ilmiannot` / `Käyttäjät` -välilehtiä ja `adminApi.searchUsers()` + `adminApi.banUser()` -kutsuja. Prisma-skeemassa on jo `PasswordResetToken` sekä `Ban.endsAt`.

Tämän vuoksi pohja on tarkoituksella rakennettu jatkamaan nykyistä rakennetta eikä esimerkiksi tuomaan uutta UI-frameworkia, uutta state management -kirjastoa tai uutta admin-järjestelmää.
