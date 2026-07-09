# My Library

API REST para administrar una biblioteca personal. El proyecto permite registrar autores, libros, tags, historial de cambios de estado y consultar estadísticas básicas.

## Tecnologías

- Node.js
- TypeScript
- Express
- PostgreSQL
- Prisma
- Zod

## Requisitos

- Node.js instalado
- PostgreSQL corriendo localmente
- Una base de datos creada para el proyecto

En mi caso la base se llama `my_library`.

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/my_library"
```

Ejemplo local:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/my_library"
```

## Instalación

```bash
npm install
```

Generar el cliente de Prisma:

```bash
npx prisma generate
```

Ejecutar migraciones:

```bash
npx prisma migrate dev
```

Levantar el servidor:

```bash
npm run dev
```

La API queda en:

```text
http://localhost:3000
```

Nota: si en Windows PowerShell `npx` da error por permisos, se puede usar `npx.cmd`.

## Endpoints

### Health check

```http
GET /
```

### Autores

Crear autor:

```http
POST /authors
Content-Type: application/json

{
  "name": "J. R. R. Tolkien",
  "country": "Reino Unido"
}
```

Listar autores:

```http
GET /authors?page=1&limit=10
```

Buscar por nombre:

```http
GET /authors?name=tolkien
```

Detalle de autor:

```http
GET /authors/:id
```

El detalle incluye el conteo de libros activos del autor.

### Libros

Crear libro:

```http
POST /books
Content-Type: application/json

{
  "title": "El Hobbit",
  "authorId": "uuid-del-autor",
  "genre": "fiction",
  "status": "to_read",
  "tags": ["classic", "fantasy"]
}
```

Crear libro leído con rating:

```http
POST /books
Content-Type: application/json

{
  "title": "Clean Code",
  "authorId": "uuid-del-autor",
  "genre": "other",
  "status": "read",
  "rating": 5,
  "tags": ["programming"]
}
```

Listar libros:

```http
GET /books
```

Filtros disponibles:

```http
GET /books?status=reading
GET /books?genre=fiction
GET /books?authorId=uuid-del-autor
GET /books?authorName=tolkien
GET /books?tag=classic
GET /books?minRating=4
GET /books?page=1&limit=10
GET /books?sortBy=title&order=asc
```

Los filtros se pueden combinar:

```http
GET /books?status=read&tag=classic&minRating=4&page=1&limit=10
```

Respuesta del listado:

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0
  }
}
```

Detalle de libro:

```http
GET /books/:id
```

Actualizar libro:

```http
PATCH /books/:id
Content-Type: application/json

{
  "status": "read",
  "rating": 5,
  "tags": ["classic", "adventure"]
}
```

Eliminar libro:

```http
DELETE /books/:id
```

El delete es lógico. No borra el registro, solo llena `deletedAt`.

Historial de estados:

```http
GET /books/:id/history
```

### Estadísticas

```http
GET /stats
```

Devuelve:

```json
{
  "totalBooks": 0,
  "byStatus": {
    "to-read": 0,
    "reading": 0,
    "read": 0
  },
  "byGenre": {},
  "averageRating": 0,
  "topRatedBook": null,
  "mostReadAuthor": null,
  "topTags": []
}
```

## Valores aceptados

Géneros:

```text
fiction
non_fiction
science
history
biography
other
```

Estados:

```text
to_read
reading
read
```

El campo `rating` solo se acepta cuando el libro tiene estado `read`.

## Decisiones técnicas

- Uso Prisma para modelar las relaciones entre autores, libros, tags e historial.
- Uso Zod para validar body, params y query antes de llegar a Prisma.
- Los tags se guardan en minúsculas y se reutilizan con `connectOrCreate`.
- Al crear un libro se registra la primera entrada en `StatusHistory`.
- Cuando cambia el estado de un libro se crea otra entrada de historial.
- El borrado de libros es soft delete usando `deletedAt`.
- Las estadísticas se calculan con consultas de Prisma, no trayendo todos los libros a memoria.

## Comandos útiles

Validar TypeScript:

```bash
npx tsc --noEmit
```

Validar Prisma:

```bash
npx prisma validate
```

Ver estado de migraciones:

```bash
npx prisma migrate status
```

## Pendiente

- Agregar script de seed.
- Agregar pruebas.
- Completar colección de Postman.
- Agregar middleware centralizado de errores.
