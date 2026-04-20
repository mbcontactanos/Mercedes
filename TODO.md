# ToDo de corrección del login

Este documento resume el incidente de redirección detectado tras el inicio de sesión y deja constancia del ajuste aplicado para acelerar la validación y el despliegue.

| Área | Estado | Detalle |
| --- | --- | --- |
| Diagnóstico | Completado | Se confirmó que la pantalla en blanco coincidía con un error de React por **orden inconsistente de hooks** en la página de login. |
| Login | Corregido | La página de acceso ya no devuelve una redirección antes de ejecutar todos sus hooks. |
| Redirección post-login | Corregido | El flujo de autenticación ahora devuelve una ruta de destino y navega directamente al panel correcto según rol y contexto móvil. |
| Verificación local | Pendiente | Falta ejecutar build y comprobación rápida del flujo tras aplicar el parche. |
| Despliegue Vercel | Pendiente | Falta publicar la corrección y validar la URL generada en producción o preview. |

La corrección prioriza estabilidad y rapidez. En lugar de depender de una entrada intermedia en `/`, el login utiliza ahora una ruta de destino ya resuelta después de autenticar al usuario, lo que reduce el riesgo de estados transitorios inconsistentes.

Como siguiente paso operativo, se debe construir la aplicación, desplegarla y comprobar el acceso con los usuarios de prueba tanto en escritorio como en móvil.
