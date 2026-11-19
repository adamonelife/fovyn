import {describe,it,expect} from 'vitest';
import {parseReadingImport} from './readingImport';
describe('reading CSV',()=>{
 it('recognises Goodreads shelves and quotes without inventing missing data',()=>{expect(parseReadingImport('Title,Author,Exclusive Shelf,Binding,ISBN13\n"A, Book",Writer,read,Paperback,123\nOther,Writer,currently-reading,Audio Book,\nUnknown,,,,')).toEqual([{title:'A, Book',author:'Writer',edition:'123',genre:'unspecified',format:'book',status:'completed'},{title:'Other',author:'Writer',edition:'',genre:'unspecified',format:'audiobook',status:'reading'},{title:'Unknown',author:'',edition:'',genre:'unspecified',format:'book',status:'unspecified'}])});
 it('deduplicates matching book identities',()=>{expect(parseReadingImport('Title,Author,Status\nBook,Author,want\nbook,author,want')).toHaveLength(1)});
});
