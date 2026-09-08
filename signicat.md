# Habahub -- Signicat / Finnish Trust Network (FTN)

**Päivitetty:** 2026-09-08

## Tarkoitus

Tämä dokumentti on tarkoitettu suoraan Claude Code / Claude -agentille
Signicat FTN -integraation toteutus- ja vaatimusmäärittelyksi.

## 1. Arkkitehtuurin periaate

Habahub käyttää Signicatia vahvaan suomalaiseen tunnistautumiseen
(Finnish Trust Network, FTN).

Tavoite on, että Habahub saa vain:

-   OIDC `sub` -tunnisteen
-   varmennetun koko nimen (`name`)

Habahub ei saa käyttää käyttäjätunnisteena:

-   HETU / `nin`
-   `ftn_hetu`
-   `idp_id`
-   `ftn_sub`
-   `ftn_satu`

Signicatin FTN-dokumentaatio osoittaa, että FTN:n kautta on saatavilla
myös kansallinen tunnistenumero, syntymäaika ja muita claim-arvoja.
Siksi claimien minimointi pitää tehdä nimenomaan Signicat-clientin
konfiguraatiolla eikä olettaa, että `profile` tarkoittaisi vain nimeä.

## 2. Viralliset dokumentit

-   FTN: https://developer.signicat.com/identity-methods/ftn/
-   FTN OIDC:
    https://developer.signicat.com/identity-methods/ftn/integration-guide/oidc-ftn/
-   FTN attributes:
    https://developer.signicat.com/identity-methods/ftn/attributes-reference/
-   FTN initial preparations:
    https://developer.signicat.com/identity-methods/ftn/integration-guide/prerequisites/
-   FTN sandbox:
    https://developer.signicat.com/identity-methods/ftn/test/
-   OIDC implementation:
    https://developer.signicat.com/docs/eid-hub/oidc/oidc-implementation/
-   Pricing: https://www.signicat.com/pricing
-   Security & compliance:
    https://www.signicat.com/security-and-compliance
-   FTN identification principles:
    https://www.signicat.com/fi/tietoa-meista/tunnistusperiaatteet-suomen-luottamusverkosto

## 3. OIDC-protokolla

Käytä:

-   OpenID Connect
-   OAuth 2.0 Authorization Code flow
-   PKCE (`S256`)
-   `state`
-   `nonce`
-   FTN:n vaatima authentication request signing tai PAR
-   Full Message-Level Encryption (MLE)

Älä käytä implicit flow'ta.

Signicatin domain on asiakaskohtainen:

`https://<YOUR_SIGNICAT_DOMAIN>`

Discovery:

`GET https://<YOUR_SIGNICAT_DOMAIN>/auth/open/.well-known/openid-configuration`

Lue discovery-documentista:

-   `issuer`
-   `authorization_endpoint`
-   `token_endpoint`
-   `userinfo_endpoint`
-   `jwks_uri`

Älä hardcodea JWKS-avaimia.

## 4. Authorization endpoint

Endpoint:

`GET https://<YOUR_SIGNICAT_DOMAIN>/auth/open/connect/authorize`

Esimerkki:

``` text
https://<YOUR_SIGNICAT_DOMAIN>/auth/open/connect/authorize
?client_id=<OIDC_CLIENT_ID>
&response_type=code
&redirect_uri=https://habahub.example.com/auth/signicat/callback
&scope=<VENDOR_CONFIRMED_SCOPE>
&acr_values=idp:ftn
&state=<RANDOM_STATE>
&nonce=<RANDOM_NONCE>
&code_challenge=<PKCE_CODE_CHALLENGE>
&code_challenge_method=S256
```

`redirect_uri` on oltava HTTPS ja sen on vastattava OIDC-clientin
konfiguraatiota.

## 5. Token endpoint

Endpoint:

`POST https://<YOUR_SIGNICAT_DOMAIN>/auth/open/connect/token`

Content-Type:

`application/x-www-form-urlencoded`

Esimerkki:

``` bash
curl -X POST   "https://<YOUR_SIGNICAT_DOMAIN>/auth/open/connect/token"   -H "Authorization: Basic <BASE64_CLIENT_ID_AND_SECRET>"   -H "Content-Type: application/x-www-form-urlencoded"   -d "grant_type=authorization_code"   -d "redirect_uri=https://habahub.example.com/auth/signicat/callback"   -d "code=<AUTHORIZATION_CODE>"   -d "code_verifier=<PKCE_CODE_VERIFIER>"
```

Tyypillinen token response:

``` json
{
  "id_token": "JWT",
  "access_token": "ACCESS_TOKEN",
  "expires_in": 600,
  "token_type": "Bearer",
  "scope": "openid profile"
}
```

## 6. FTN scope -määrittely

Signicatin FTN OIDC -dokumentaatio listaa:

``` text
openid
profile
idp-id
nin
ftn-extra
```

`openid` on pakollinen.

### `profile`

Dokumentaation mukaan `profile` voi palauttaa:

``` text
name
given_name
family_name
birthdate
```

Siksi `profile` ei automaattisesti tarkoita "vain nimi".

### `nin`

ÄLÄ KÄYTÄ.

`nin` = national identification number / HETU.

### `ftn-extra`

ÄLÄ KÄYTÄ.

Se sisältää mm.:

``` text
ftn_idp
ftn_issuer
ftn_hetu
ftn_satu
ftn_sub
```

Erityisesti `ftn_hetu` on HETU.

### `idp-id`

ÄLÄ KÄYTÄ ilman Signicatin kirjallista vahvistusta.

Signicatin attributes-dokumentaation esimerkki `idp_id`-arvosta
muistuttaa HETU:a. Signicatilta pitää varmistaa, ettei claim ole HETU,
HETU:sta johdettu tai muu kansallinen tunnistenumero.

### `ftn_sub`

ÄLÄ KÄYTÄ Habahubin pysyvänä käyttäjätunnisteena. Signicat sanoo
suoraan, ettei sitä pidä käyttää pysyvänä tunnisteena, koska se voi olla
transientti eikä sen taata olevan globaalisti uniikki.

## 7. Habahubin tavoiteclaimit

Tavoite:

``` json
{
  "sub": "SIGNICAT_SUBJECT_IDENTIFIER",
  "name": "Väinö Tunnistus"
}
```

Tietokantaan:

``` text
users.id
users.signicat_subject
users.display_name
users.identity_verified_at
users.created_at
users.updated_at
```

Ei:

``` text
hetu
nin
ftn_hetu
birthdate
ftn_sub
idp_id
ftn_satu
```

## 8. ID Token User Data

Signicatin Dashboardissa:

`Products > eID and Wallet Hub > OIDC Clients > client > Advanced > Security`

ID Token User data -asetukset ovat:

-   Standard Scopes
-   All
-   Minimal

`Minimal` palauttaa vain `sub`.

`All` palauttaa kaikki claimit.

Habahub ei saa käyttää `All`-asetusta.

**Blocker:** julkisesta dokumentaatiosta ei käy yksiselitteisesti ilmi,
voiko `profile`-scopesta whitelistata vain `name` niin, että
`birthdate`, `given_name` ja `family_name` eivät palaudu.

Tämä on vahvistettava Signicatilta ennen tuotantototeutusta.

## 9. UserInfo

UserInfo endpoint löytyy OIDC discovery-documentista.

Pyyntö:

``` http
GET <USERINFO_ENDPOINT>
Authorization: Bearer <ACCESS_TOKEN>
```

Signicatin dokumentoidussa esimerkissä UserInfo voi sisältää:

``` json
{
  "idp_id": "...",
  "name": "Väinö Tunnistus",
  "family_name": "Tunnistus",
  "given_name": "Väinö",
  "birthdate": "1970-07-07",
  "nin": "070770-905D",
  "nin_type": "PERSON",
  "nin_issuing_country": "FI",
  "idp_issuer": "...",
  "sub": "..."
}
```

Siksi backendissä pitää olla explicit allowlist:

``` text
ALLOW:
  sub
  name

DENY:
  nin
  ftn_hetu
  idp_id
  ftn_sub
  ftn_satu
  birthdate
  given_name
  family_name
  nin_type
  nin_issuing_country
  idp_issuer
```

Kiellettyjä claim-arvoja ei saa tallentaa, logata, lähettää frontendille
tai lähettää analytics/error-tracking-palveluihin.

## 10. Dashboard ja client credentials

OIDC-client luodaan:

`Products > eID and Wallet Hub > OIDC clients > Create/Add client`

Valitse Authorization Code.

Redirect URI lisätään clientiin.

Allowed scopes määritellään:

`OIDC client > Access > Allowed scopes`

Client secret:

`OIDC client > Secrets > Add secret`

Signicatin dokumentaatio kertoo, että client secret näytetään vain
kerran luomisen jälkeen. Jos se katoaa, luodaan uusi secret.

Älä koskaan vie client secretiä selaimeen.

## 11. Sandbox

Signicat tarjoaa FTN-sandboxin.

Perusprosessi:

1.  Signicat Dashboard -tili
2.  organisation
3.  sandbox account
4.  domain
5.  FTN tuotteisiin
6.  OIDC client
7.  testikäyttäjä

Signicatin FTN-testidokumentaatiossa on pankkikohtaisia testikäyttäjiä.
Tuotannossa käytetään oikeita FTN-tunnistusvälineitä.

Älä käytä tuotannon pankkitunnuksia sandbox-testaukseen.

Signicatin Dashboard/testing privacy statement ilmoittaa
sandbox-testidatan retention-ajaksi 30 päivää.

## 12. FTN:n tuotantoturva

Signicatin FTN initial preparations -dokumentaatio kertoo Traficomin
vaativan:

-   authentication request signing
-   Full Message-Level Encryption (MLE)

Signicat hyväksyy request signingin vaihtoehdoksi myös PAR:n.

Jos Habahub käyttää PAR:ia:

``` text
POST https://<YOUR_SIGNICAT_DOMAIN>/auth/open/connect/par
```

PAR tehdään backendistä, ei frontendistä.

## 13. JWT-validointi

ID Token on JWT.

Backendin on tarkistettava vähintään:

``` text
signature
iss
aud
exp
iat
nonce
sub
```

JWKS löytyy discovery-documentin `jwks_uri`-kentästä.

Älä hyväksy JWT:tä pelkän Base64-dekoodauksen perusteella.

Signicat kertoo kierrättävänsä signing keyt säännöllisesti; käytä
JWKS-discoverya ja avaincachea, joka osaa hakea uudet avaimet `kid`:n
perusteella.

## 14. state

Luo kryptografisesti satunnainen state jokaiselle loginille.

Tallenna se lyhytaikaisesti.

Callbackissa:

``` text
received_state == stored_state
```

Jos ei täsmää:

``` text
reject
```

## 15. nonce

Luo jokaiselle loginille nonce.

Callbackin ID Tokenissa:

``` text
id_token.nonce == stored_nonce
```

Jos ei täsmää:

``` text
reject
```

## 16. Callback

Callback:

``` text
GET /auth/signicat/callback?code=...&state=...
```

Backend:

1.  tarkista state
2.  hae PKCE verifier
3.  vaihda code tokeniksi
4.  validoi ID Token
5.  tarkista issuer
6.  tarkista audience
7.  tarkista signature
8.  tarkista exp
9.  tarkista nonce
10. lue `sub`
11. lue vain vendor-confirmed name claim
12. hae/luo Habahub user
13. luo Habahub session
14. poista temporary auth state

## 17. Tietokanta

Suositeltu:

``` text
users
  id                    UUID/ULID PRIMARY KEY
  signicat_subject       VARCHAR UNIQUE NOT NULL
  display_name           VARCHAR NOT NULL
  identity_verified_at   TIMESTAMP NOT NULL
  created_at             TIMESTAMP NOT NULL
  updated_at             TIMESTAMP NOT NULL
```

Älä lisää HETU-kenttää vain "varmuuden vuoksi".

## 18. Logging

Älä loggaa:

-   id_token
-   access_token
-   refresh_token
-   authorization code
-   client secret
-   koko callback URL:ia
-   HETU:a
-   syntymäaikaa
-   UserInfo responsea sellaisenaan

Hyvä audit event:

``` json
{
  "event": "identity.authentication.success",
  "provider": "signicat",
  "method": "ftn",
  "user_id": "habahub-user-uuid",
  "timestamp": "2026-09-08T12:00:00Z"
}
```

## 19. Hinnoittelu

Signicatin julkinen pricing-sivu ei anna yhtä yleistä FTN-hintaa.

Signicat kertoo hinnoittelun muodostuvan tuotteesta riippuen:

-   setup
-   subscription
-   transaction fees

FTN:n omassa kuvauksessa mainitaan:

-   kiinteä kuukausimaksu
-   transaktiomaksut
-   identiteetin tarjoajien kolmannen osapuolen käyttömaksujen
    välittäminen

Pyydä Signicatilta kirjallinen tarjous, jossa eritellään:

``` text
setup fee
monthly subscription
monthly minimum
successful authentication fee
failed authentication fee
cancelled authentication fee
FTN bank pass-through fees
Mobiilivarmenne fee
sandbox fee
production fee
volume tiers
minimum commitment
support/SLA
VAT
```

## 20. GDPR / DPA

Signicat kertoo toimivansa asiakkaan henkilötietojen käsittelijänä ja
tarjoavansa GDPR:n mukaisen DPA:n.

Habahubin tulee käsitellä sopimusroolit erikseen:

``` text
Habahub = controller
Signicat = processor
```

Tämä on vahvistettava lopullisesta DPA:sta ja kyseisen tuotteen
sopimuksesta.

## 21. Retention

Älä kovakoodaa tuotantoon esimerkiksi:

``` text
retention = 30 days
```

FTN:n julkisessa materiaalissa Signicat kertoo säilyttävänsä
tunnistustapahtumatietoja teknisissä lokeissa turvallisuuden, vakauden
ja lainsäädännön vuoksi, mutta tästä ei seuraa yhtä yksinkertaista
tuotannon PII-retention-arvoa.

Pyydä Signicatilta kirjallisesti:

``` text
authentication transaction retention
technical log retention
audit log retention
security log retention
backup retention
deletion SLA
subprocessor retention
data residency
international transfers
```

Sandbox-testidatan 30 päivän retention ei ole tuotannon retention.

## 22. Vendor confirmation -- tämä on blocker

Signicatilta on pyydettävä kirjallinen vastaus:

> We are integrating Finnish Trust Network (FTN) through Signicat using
> OIDC. Our privacy requirement is that Habahub must never receive or
> store the Finnish national identification number (HETU), date of
> birth, or any equivalent national identifier.
>
> We only need:
>
> 1.  OIDC `sub`
> 2.  verified full name (`name`)
>
> Please confirm the exact Signicat Dashboard configuration and exact
> OIDC scopes/claim configuration that guarantees that `nin`,
> `ftn_hetu`, `idp_id`, `ftn_sub`, `birthdate`, `given_name`,
> `family_name`, `ftn_satu` and other national-ID-related claims are not
> returned to Habahub.
>
> Please also confirm whether `sub` is stable for the same end user
> across repeated FTN authentications and across different Finnish
> identity providers, and define its uniqueness scope.
>
> We explicitly do not want to use `idp-id`, `nin`, `ftn_hetu`,
> `ftn_satu` or `ftn_sub` as our user identifier.
>
> Please provide the exact Dashboard settings, exact scopes, and example
> ID token/UserInfo response for this configuration.

## 23. Claude Code - pakolliset säännöt

1.  Älä arvaa endpointteja.
2.  Lue OIDC discovery.
3.  Älä käytä `nin`.
4.  Älä käytä `ftn-extra`.
5.  Älä käytä `ftn_sub`.
6.  Älä käytä `idp-id` ennen Signicatin kirjallista vahvistusta.
7.  Älä tallenna HETU:a.
8.  Älä tallenna syntymäaikaa.
9.  Älä loggaa OIDC tokeneita.
10. Käytä Authorization Code + PKCE.
11. Käytä state + nonce.
12. Validoi JWT signature + iss + aud + exp + nonce.
13. Käytä JWKS discoverya.
14. Käytä explicit claim allowlistia.
15. Jos `sub + name` -minimiä ei voida varmistaa Signicatin päässä, STOP
    ja raportoi blocker.
16. Älä ratkaise blockeria arvauksella.
17. Testaa sandbox ennen productionia.
18. Pidä Signicat identity ja Stripe KYC erillään.

## 24. Testit

Toteuta vähintään:

-   successful FTN login
-   state mismatch
-   nonce mismatch
-   expired ID token
-   invalid JWT signature
-   invalid issuer
-   invalid audience
-   duplicate login
-   sama käyttäjä eri FTN-providerillä
-   odottamaton `nin` claim
-   odottamaton `ftn_hetu` claim
-   UserInfo, joka sisältää ylimääräisiä claim-arvoja
-   logout/session rotation

## 25. Lopullinen tavoite

``` text
User
  |
  v
Habahub
  |
  | OIDC Authorization Code + PKCE
  v
Signicat
  |
  | Finnish Trust Network
  v
Bank ID / Mobiilivarmenne
  |
  v
Signicat
  |
  | authorization code
  v
Habahub backend
  |
  | token exchange + JWT validation
  v
Habahub user
```

Tietokantaan halutaan:

``` text
random internal user id
Signicat OIDC sub
verified display name
verification timestamp
```

Ei HETU:a.

## 26. Nykyinen avoin kysymys

Julkinen Signicat-dokumentaatio vahvistaa:

-   `nin` on HETU
-   `ftn-extra` sisältää `ftn_hetu`
-   `profile` voi sisältää `name`, `given_name`, `family_name`,
    `birthdate`
-   `Minimal` ID Token User Data palauttaa vain `sub`
-   `All` palauttaa kaikki claimit

Julkisesta dokumentaatiosta ei kuitenkaan käy yksiselitteisesti ilmi,
että FTN OIDC-clientissä voisi määritellä claim-level whitelistin, joka
palauttaa täsmälleen:

``` text
sub + name
```

ja estää kaikki muut henkilötiedot.

**Tätä ei saa arvata. Se on vahvistettava Signicatilta ennen production
implementationia.**
