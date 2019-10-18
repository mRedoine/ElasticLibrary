const vm = new Vue ({
  el: '#vue-instance',
  data () {
    return {
      baseUrl: 'http://localhost:3000', 
      searchTerm: 'Sioux', // Terme recherché par défaut
      searchDebounce: null, // Latence pour les frappes au clavier
      searchResults: [], // Resultats de la recherche affichés
      numHits: null, // Nombre de résultats obtenus
      searchOffset: 0, // Pagination des résultats de la recherche

      selectedParagraph: null, // Paragraphe selectionné
      bookOffset: 0, // Décalage pour les paragraphes du livre affichés
      paragraphs: [] // Paragraphes affichés dans la fenêtre de pré-visualisation
    }
  },
  async created () {
    this.searchResults = await this.search() // Recherche du terme par défaut :-) Sioux
  },
  methods: {
    /** Latence de 100ms entre chaque frappe du clavier */
    onSearchInput () {
      clearTimeout(this.searchDebounce)
      this.searchDebounce = setTimeout(async () => {
        this.searchOffset = 0
        this.searchResults = await this.search()
      }, 100)
    },
    /** Appel vers l'API pour la recherche du ou des termes */
    async search () {
      const response = await axios.get(`${this.baseUrl}/search`, { params: { term: this.searchTerm, offset: this.searchOffset } })
      this.numHits = response.data.hits.total
      return response.data.hits.hits
    },
    /** Affichage de la prochaine page */
    async nextResultsPage () {
      if (this.numHits > 10) {
        this.searchOffset += 10
        if (this.searchOffset + 10 > this.numHits) { this.searchOffset = this.numHits - 10}
        this.searchResults = await this.search()
        document.documentElement.scrollTop = 0
      }
    },
    /** Affichage de la page précédente */
    async prevResultsPage () {
      this.searchOffset -= 10
      if (this.searchOffset < 0) { this.searchOffset = 0 }
      this.searchResults = await this.search()
      document.documentElement.scrollTop = 0
    },
    /** Obtention de la page des paragraphes trouvés */
    async getParagraphs (bookTitle, offset) {
      try {
        this.bookOffset = offset
        const start = this.bookOffset
        const end = this.bookOffset + 10
        const response = await axios.get(`${this.baseUrl}/paragraphs`, { params: { bookTitle, start, end } })
        return response.data.hits.hits
      } catch (err) {
        console.error(err)
      }
    },
    /** Affichage de la prochaine page (pas de 10 paragraphes) du livre selectionné */
    async nextBookPage () {
      this.$refs.bookModal.scrollTop = 0
      this.paragraphs = await this.getParagraphs(this.selectedParagraph._source.title, this.bookOffset + 10)
    },
    /** Affichage de la page précédente (pas de 10 paragraphes) du livre selectionné */
    async prevBookPage () {
      this.$refs.bookModal.scrollTop = 0
      this.paragraphs = await this.getParagraphs(this.selectedParagraph._source.title, this.bookOffset - 10)
    },
    
    /** Affichage des paragraphes du livre selectionné dans une fenêtre modale */
    async showBookModal (searchHit) {
      try {
        document.body.style.overflow = 'hidden'
        this.selectedParagraph = searchHit
        this.paragraphs = await this.getParagraphs(searchHit._source.title, searchHit._source.location - 5)
      } catch (err) {
        console.error(err)
      }
    },
    /** Fermeture de la modale */
    closeBookModal () {
      document.body.style.overflow = 'auto'
      this.selectedParagraph = null
    }
  }
})