# Música de fondo

29 temas a **128 kbps** (~131 MB), commiteados al repo. Se sirven en `/music/*.mp3`.

- Manifiesto (orden + títulos): `frontend/src/lib/musica.ts` → lista `PISTAS`.
- Nombres de archivo: slug (minúsculas, guiones, sin espacios ni acentos). Debe coincidir con
  el campo `archivo` de `PISTAS`.
- La reproducción arranca con el **gesto del usuario** ("Entrar al taller" / "Continuar" del
  diagnóstico). Al recargar la página queda pausada hasta que se pulsa Reanudar.
- Si un archivo falta o está corrupto, el reproductor salta al siguiente solo.

## Agregar un tema

```
ffmpeg -i entrada.mp3 -vn -c:a libmp3lame -b:a 128k -ar 44100 -ac 2 -map_metadata -1 slug.mp3
```

Poné `slug.mp3` en esta carpeta y sumá `{ archivo: 'slug.mp3', titulo: '…' }` a `PISTAS`.

## Servir desde otro lado (opcional, para producción)

`src/lib/musica.ts` respeta `VITE_MUSICA_URL` (una base que termina en `/`). Si algún día el repo
pesa demasiado o el ancho de banda de Netlify no alcanza, subís los mp3 a un CDN (jsDelivr desde
un repo aparte, Cloudflare R2, un sitio Netlish solo con la música) y definís esa variable.
Ver `frontend/.env.example`.
