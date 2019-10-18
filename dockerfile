# Utilisation de Node v8.9.0 LTS
FROM node:carbon

# Définition du dossier de l'application
WORKDIR /usr/src/app

# Copie de package.json et de package-lock.json
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie du code source
COPY . .

# Lancement de l'application
CMD [ "npm", "start" ]