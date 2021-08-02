const fs = require('fs');
const path = require('path');
const esConnection = require('./connection');

/** Lecture de chaque fichier .txt, extraction du titre, de l'auteur, et des paragraphes */
 function parseBookFile(filePath){
	console.log('filePath '+filePath)
	// Lecture du fichier texte
	const book = fs.readFileSync(filePath, 'utf8');

	// Recherche des titres et des auteurs
	const title = book.match(/^Title:\s(.+)$/m)[1]
	const authorMatch = book.match(/^Author:\s(.+)$/m)
	const author = (!authorMatch || authorMatch[1].trim() === '') ? 'Auteur inconnu' : authorMatch[1]


	console.log(`Lecture de ${title} par ${author}`);
	
	// Délimitations du texte qui contient les paragraphes
	const startOfBookMatch = book.match(/^\*{3}\s*START OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m);
	const startOfBookIndex = startOfBookMatch.index + startOfBookMatch[0].length;
	const endOfBookIndex = book.match(/^\*{3}\s*END OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m).index;

	// Création de paragraphes
	const paragraphs = book
    .slice(startOfBookIndex, endOfBookIndex) // Suppression des délimitations (START OF (THIS|THE) PROJECT GUTENBERG EBOOK / END....)
    .split(/\n\s+\n/g) // Séparation des paragraphes dans leur propre indice du tableau
    .map(line => line.replace(/\r\n/g, ' ').trim()) // Suppression des espaces et des caractères de fin de ligne
    .map(line => line.replace(/_/g, '')) // Le "_" est utilisé pour les textes en italique -> Suppression
    .filter((line) => (line && line !== '')); // Suppression des lignes vides

  console.log(`J'ai analysé ${paragraphs.length} paragraphes\n`);
   return { title, author, paragraphs }
}

/* Indexation en masse dans ElasticSearch */
async function insertBookData(title, author, paragraphs) {
	console.log('paragraphs '+paragraphs.length)
	
	let bulkOps = []; // Tableau des opérations de masse

	//Ajout d'une opération d'indexation pour chaque section du livre
	  for (let i = 0; i < paragraphs.length; i++) {
		// Description de l'action
		bulkOps.push({ index: { _index: esConnection.index, _type: esConnection.type } });

		//Ajout du document
		bulkOps.push({
			author, 
			title,
			location:i,
			text: paragraphs[i]
		});

		if (i > 0 && i % 500 ===0) { // Insertion par groupe de 500
		await esConnection.client.bulk({body: bulkOps});
		bulkOps = [];
		console.log(`Nombre de paragraphes indexés ${i - 499} - ${i}`)
	}
}

	// Insertion du reste du tableau d'opérations
  await esConnection.client.bulk({ body: bulkOps })
  console.log(`J\'ai indexé ${paragraphs.length - (bulkOps.length / 2)} - ${paragraphs.length} paragraphes\n\n\n`)

}
 
 /* Réinitialise l'index dans ElasticSearch, analyse et indexe tous les fichiers du dossier */
async function readAndInsertBook(){
	await esConnection.checkConnection();
	try {
		// Suppression de l'index présent (si il existe ...)
		await esConnection.resetIndex();

		//Lecture du repertoire qui contient les livres
		let files = fs.readdirSync('./books').filter(file => file.slice(-4)=== '.txt');
		console.log(`J'ai trouvé ${files.length} fichiers!`);
		console.log('Files 0 '+files[0]);

		/* Lecture de chaque paragraphe et indexation dans ElasticSearch */
		 for (let file of files) {
      console.log(`Lecture de - ${file}`)
      const filePath = path.join('./books', file)
      const { title, author, paragraphs } = parseBookFile(filePath)
      await insertBookData(title, author, paragraphs)
    }
  } catch (err) {
    console.error(err)
  }
	
}


readAndInsertBook()
