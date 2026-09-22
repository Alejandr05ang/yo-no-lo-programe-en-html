# Firebase Auth — configuración del proyecto dedicado

## Recursos ya creados

- Proyecto: `tutorias-de-verano`, nombre `Tutorias-de-Verano`.
- Número: `1093002100842`.
- App web: `1:1093002100842:web:17c42f5f5ae9b62a8e0a13`.
- Auth domain: `tutorias-de-verano.firebaseapp.com`.
- Configuración pública web obtenida por el conector y guardada en `frontend/.env.local` (ignorado por Git). No es necesario enviar API Key ni App ID por chat.

No se creó otro Supabase ni se reutilizó otro Firebase. La app utiliza Firebase exclusivamente para Authentication. El campo `storageBucket` que Firebase devuelve por defecto no se usa: avatares pertenecen a Supabase.

## Habilitar los proveedores

En [Authentication del proyecto](https://console.firebase.google.com/project/tutorias-de-verano/authentication/providers):

1. Pulsa **Comenzar** si aparece y habilita **Correo electrónico/contraseña**. El acceso por enlace de correo no es necesario.
2. Habilita **Google**, selecciona el correo real de soporte que deseas mostrar y guarda.
3. En **Configuración → Dominios autorizados**, añade `localhost` para desarrollo. No incluyas protocolo ni puerto. Añade el dominio real de Netlify únicamente cuando lo tengas definido; no uses comodines.
4. Conserva una cuenta por dirección de correo y la protección contra enumeración de emails. Revisa los templates de verificación y recuperación sin incluir enlaces a dominios ajenos.

La creación del proyecto y de la app web no demuestra que los proveedores estén habilitados. En esta entrega su activación y una autenticación real permanecen pendientes. No se desplegó configuración ni aplicación a producción.

## Credencial del servidor (necesaria para la siguiente integración)

FastAPI valida el ID token con el SDK Admin y comprueba revocación/desactivación. La sesión del conector Firebase no equivale a una credencial para tu proceso Python.

Para desarrollo local, en [Configuración → Cuentas de servicio](https://console.firebase.google.com/project/tutorias-de-verano/settings/serviceaccounts/adminsdk):

1. Genera una clave privada para el SDK Admin del proyecto dedicado.
2. Guarda el JSON **fuera del repositorio** en un directorio privado de tu usuario.
3. En la terminal donde ejecutarás FastAPI, define `GOOGLE_APPLICATION_CREDENTIALS` con la ruta absoluta a ese archivo. No pegues el contenido de la clave en el chat.
4. Define `FIREBASE_PROJECT_ID=tutorias-de-verano` en `backend/.env`.

En infraestructura Google con identidad de carga de trabajo, prefiere ADC sin archivo de clave. No presupongas que un `gcloud auth application-default login` convencional sirve para todas las operaciones de Firebase Auth: la guía oficial especifica restricciones para credenciales de usuario final.

## Valores públicos del cliente

Si necesitas recuperar la configuración en otra computadora, abre [Configuración general → Tus apps → App web](https://console.firebase.google.com/project/tutorias-de-verano/settings/general). Copia los valores a un `.env.local` que no se versiona:

| Variable | Campo Firebase |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |

`VITE_API_URL` apunta a FastAPI y termina en `/api`. No se añade service account, DB URL o secreto Supabase a ninguna variable `VITE_*`.

## Validación pendiente con identidad real

Registrar cuenta → recibir y abrir verificación → actualizar token → bootstrap → comprobar rol en DB. Luego probar login Google y linking desde la cuenta autenticada, conservar el mismo UID, recuperación con mensaje neutral y logout. Usar cuentas reales autorizadas; los tests unitarios no crean cuentas remotas.

No marcar DEMO MVP PASS hasta completar también perfil, avatar, cohorte y mapa con datos reales. El grader se inicia después de ese checkpoint.

Fuentes oficiales consultadas: [Firebase Admin setup](https://firebase.google.com/docs/admin/setup), [validación de ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Google sign-in y conflicto de proveedores](https://firebase.google.com/docs/auth/web/google-signin).
