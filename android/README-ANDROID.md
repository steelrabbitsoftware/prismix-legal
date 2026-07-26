# Travel Heros — Gerar o APK Android

O app é um WebView nativo que embute o jogo web (`game/`) como assets.
O ambiente de nuvem onde o Claude roda **não tem acesso aos servidores da
Google** (dl.google.com / maven.google.com), então o APK precisa ser compilado
na sua máquina — leva ~10 minutos na primeira vez.

## Opção A — Android Studio (recomendado)

1. Instale o [Android Studio](https://developer.android.com/studio) (com as
   opções padrão; ele baixa o SDK sozinho).
2. **File → Open** e selecione esta pasta `android/`.
3. Aguarde o Gradle sincronizar (primeira vez demora — baixa SDK/dependências).
4. **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
5. O APK aparece em:
   `android/app/build/outputs/apk/debug/app-debug.apk`
6. Copie para o celular e instale (permita "fontes desconhecidas").

## Opção B — Linha de comando (PowerShell)

Com o Android Studio (ou apenas o SDK + variável `ANDROID_HOME`) instalado:

```powershell
cd C:\Users\Erick\Projetos\travel-heros\android
.\gradlew.bat assembleDebug
```

APK em `app\build\outputs\apk\debug\app-debug.apk`.

## Notas

- **Assets**: o `app/build.gradle` aponta `assets.srcDirs` para `../../game`,
  então o APK sempre embute a versão atual do jogo — sem copiar nada.
- **Bundle JS**: o WebView carrega `app.html`, que usa `game/dist/bundle.js`
  (script único). Depois de alterar o código do jogo, regenere o bundle:
  ```powershell
  npx esbuild game/js/main.js --bundle --format=iife --minify --outfile=game/dist/bundle.js
  ```
- **Release para a Play Store**: crie uma keystore
  (`keytool -genkeypair ...`), configure `signingConfigs` no
  `app/build.gradle` e rode `gradlew assembleRelease`.
- **Alternativa sem APK**: o jogo é um **PWA** — abrindo a URL publicada no
  Chrome do Android, use "Adicionar à tela inicial" e ele instala como app
  (tela cheia, offline, com ícone).
