const elasticsearch = require('elasticsearch')


const index = 'library';
const type = 'novel';
const port = 9200;
const host = process.env.ES_HOST || 'localhost';
const client = new elasticsearch.Client({host: {host, port} });

/* Vérification du status de la connection à ElasticSearch */
async function checkConnection() {
	let isConnected = false;

	while(!isConnected){
		console.log('J\'essaie de me connecter à ElasticSearch');
		try {
			const health = await client.cluster.health({});
			console.log(health);
			isConnected = true
		}
		catch(err){
			console.log('Echec de la connexion, nouvel essai ...' + err);
		}
	}
}

/* Réinitialise l'index et recrée les mappings */
async function resetIndex() {
	if (await client.indices.exists({index})) {
		console.log('Suppression des indices');
		await client.indices.delete({index});
	}

	await client.indices.create({index});
	console.log('Creation des indicezs');
	await putBookMapping();
}

/* Ajout du mapping pour un livre dans ES */
async function putBookMapping(){
	const schema = {
		title : {type: 'keyword'},
		author: {type: 'keyword'},
		location: {type: 'integer'},
		text: {type: 'text'}

	}
	return client.indices.putMapping({index, type, body: {properties: schema}})
}

module.exports = {
	client, index, type, checkConnection, resetIndex
}