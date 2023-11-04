//import jsPDF from 'jspdf';
//import jsPDF from 'jspdf';
import { jsPDF } from "jspdf";

//09-11-2021...save transaction receipt
function saveReceipt(){
    //import { jsPDF } from "jspdf";  
    // Default export is a4 paper, portrait, using millimeters for units
    console.log('saveReceipt()');
    const doc = new jsPDF();
    doc.text("Hello world!", 10, 10);
    doc.setFontSize(12);
    doc.setFontType('normal');
    doc.text(65, 73.60, 'Lastname');
    doc.text(65, 81, 'Firstname');
    // generate pdf
    doc.save("a4.pdf");
}