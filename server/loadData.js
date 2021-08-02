const fs = require('fs')
const path = require('path')
const esConnection = require('./connection')

/** Lecture de chaque fichier .txt, extraction du titre, de l'auteur, et des paragraphes */
function parseBookFile (filePath) {
  // Lecture du fichier texte
  const book = fs.readFileSync(filePath, 'utf8')

  // Recherche des titres et des auteurs
  const title = book.match(/^Title:\s(.+)$/m)[1]
  const authorMatch = book.match(/^Author:\s(.+)$/m)
  const author = (!authorMatch || authorMatch[1].trim() === '') ? 'Unknown Author' : authorMatch[1]

  console.log(`Reading Book - ${title} By ${author}`)

  // // Délimitations du texte qui contient les paragraphes dans les fichiers .txt récupérés sur Guttenberg
  const startOfBookMatch = book.match(/^\*{3}\s*START OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m)
  const startOfBookIndex = startOfBookMatch.index + startOfBookMatch[0].length
  const endOfBookIndex = book.match(/^\*{3}\s*END OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m).index

  // Création de paragraphes
  const paragraphs = book
    .slice(startOfBookIndex, endOfBookIndex) // Suppression des Header et Footer de Gutenberg.
    .split(/\n\s+\n/g) // Split chaque paragraphe dans sa propre entrée tableau.
    .map(line => line.replace(/\r\n/g, ' ').trim()) // Suppression des nouvelles lignes et espaces.
    .map(line => line.replace(/_/g, '')) // Suppression du "_" utilisé par Gutenberg pour signifier l'italique.
    .filter((line) => (line && line !== '')) // Suppression des lignes vides.

  console.log(`Parsed ${paragraphs.length} Paragraphs\n`)
  return { title, author, paragraphs }
}

/* Indexation en masse dans ElasticSearch */
async function insertBookData (title, author, paragraphs) {
  console.log(title)
  let bulkOps = [] // Tableau des opérations de masse

  //Ajout d'une opération d'indexation pour chaque section du livre
  for (let i = 0; i < paragraphs.length; i++) {
    bulkOps.push({ index: { _index: esConnection.index, _type: esConnection.type } })

    // Ajout document
    bulkOps.push({
      author,
      title,
      location: i,
      text: paragraphs[i]
    })

    if (i > 0 && i % 500 === 0) { // Insertion par groupe de 500 paragraphes
      await esConnection.client.bulk({ body: bulkOps })
      bulkOps = []
      console.log(`Nombre de paragraphes indexés  ${i - 499} - ${i}`)
    }
  }

  // Insertion dans tableau d'opérations
  await esConnection.client.bulk({ body: bulkOps })
  console.log(`J'ai indexé ${paragraphs.length - (bulkOps.length / 2)} - ${paragraphs.length}\n\n\n`)
}

// Insertion du reste du tableau d'opérations
async function readAndInsertBooks () {
  await esConnection.checkConnection()

  try {
    // Suppression de l'index présent
    await esConnection.resetIndex()

    //Lecture du repertoire qui contient les livres
    let files = fs.readdirSync('./books').filter(file => file.slice(-4) === '.txt')
    console.log(`Found ${files.length} Files`)

    /* Lecture de chaque paragraphe et indexation dans ElasticSearch */
    for (let file of files) {
      console.log(`Reading File - ${file}`)
      const filePath = path.join('./books', file)
      const { title, author, paragraphs } = parseBookFile(filePath)
      await insertBookData(title, author, paragraphs)
    }
  } catch (err) {
    console.error(err)
  }
}

readAndInsertBooks()
