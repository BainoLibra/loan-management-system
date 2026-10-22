const postJournalEntry = async (tx, entry) => tx.journalEntry.create({ data: entry });

module.exports = { postJournalEntry };