# Test

Exercice technique pour l’entretien - Fiters

Ce projet a pour stack :
- Vue 3 (frontend)  
- Express.js (backend)
- PostgreSQL (database)
- TailwingCSS (CSS)


commande utile pour le projet 

## Configuration du projet (FrontEnd)

```sh
cd Frontend 
```

```sh
npm install
```

### Compiler et recharger pour le développement

```sh
npm run dev
```

### Effectuer des tests unitaires avec[Le plus vide](https://vitest.dev/)

```sh
npm run test:unit
```

### Effectuez des tests de bout en bout avec[Dramaturge](https://playwright.dev)

```sh
npx playwright install

npx playwright test
```

### Formater le code

```sh
npm run format
```
## Configuration du projet (BackEnd)

```sh
cd Backend 
```

```sh
npm install
```

### Compiler et recharger pour le développement

```sh
node index.js
```