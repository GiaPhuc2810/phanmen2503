# Inventory API

API Node.js luu du lieu trong SQL Server.

## Chay project

```bash
set DB_USER=phuc
set DB_PASSWORD=123
set DB_NAME=sp
set DB_SERVER=localhost\SQLEXPRESS
node src/server.js
```

Server mac dinh chay tai `http://localhost:3000`.

Mac dinh source da su dung san:
- `DB_USER=phuc`
- `DB_PASSWORD=123`
- `DB_NAME=sp`
- `DB_SERVER=localhost\\SQLEXPRESS`

## API

### 1. Tao product va inventory tu dong

`POST /products`

```json
{
  "name": "IPhone 16 Pro"
}
```

### 2. Lay tat ca inventory

`GET /inventories`

### 3. Lay inventory theo ID

`GET /inventories/:id`

### 4. Tang stock

`POST /inventories/add-stock`

```json
{
  "product": "productId",
  "quantity": 10
}
```

### 5. Giam stock

`POST /inventories/remove-stock`

```json
{
  "product": "productId",
  "quantity": 3
}
```

### 6. Reservation

`POST /inventories/reservation`

```json
{
  "product": "productId",
  "quantity": 2
}
```

### 7. Sold

`POST /inventories/sold`

```json
{
  "product": "productId",
  "quantity": 1
}
```

## Test nhanh

```bash
node tests/api.test.js
```
