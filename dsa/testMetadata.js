import { FileMetadata } from "./FileMetadata.js";

const metadata = new FileMetadata();

metadata.addFile({
    name: "joins.pdf",
    extension: ".pdf",
    path: "C:/College/DBMS/joins.pdf",
    size: 24576
});

metadata.addFile({
    name: "exceptions.txt",
    extension: ".txt",
    path: "C:/College/Java/exceptions.txt",
    size: 1024
});

console.log("Total files:", metadata.getSize());

console.log(
    "Search result:",
    metadata.getFile("C:/College/DBMS/joins.pdf")
);

console.log("All files:", metadata.getAllFiles());
