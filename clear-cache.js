// Clear IndexedDB Cache Script
// Open browser console and paste this to clear all cached data

// Clear all IndexedDB databases
indexedDB.databases().then(dbs => {
    dbs.forEach(db => {
        console.log('Deleting database:', db.name);
        indexedDB.deleteDatabase(db.name);
    });
    console.log('All IndexedDB databases cleared!');
    console.log('Please refresh the page now.');
});

// Also clear localStorage
localStorage.clear();
console.log('localStorage cleared!');

// Clear sessionStorage
sessionStorage.clear();
console.log('sessionStorage cleared!');
