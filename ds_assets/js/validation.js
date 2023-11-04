// For the layers, on each of the steps in the process (multi-step form) we confirm if the users want to skip the step
// 24-June-2022

var maskingCompleted = false;
var encryptionCompleted = false;
var notarisationCompleted = false;

function validateMasking(){
    var maskingbutton = document.getElementById("mask");
    console.log(maskingbutton.dataset.clicked ? "Yes" : "No");
    if (maskingbutton.dataset.clicked)
      console.log('Masking done')
    else{
      console.log('Masking not done')
      var proceed = confirm('Are you sure you want to skip masking')      
        if (proceed) {
        //proceed
        } else {
        //don't proceed
        }
    }
  }   
  
  function validateEncryption(){
    var maskingbutton = document.getElementById("mask");
    console.log(maskingbutton.dataset.clicked ? "Yes" : "No");
    if (maskingbutton.dataset.clicked)
      console.log('Masking done')
    else{
      console.log('Masking not done')
      confirm('Are you sure you want to skip encryption')
    }
  }    

function fileValidation(flow){
  if(flow == 1){       //safeguarding
    fileInput = document.getElementById('sensitiveInput');    //store first and only file as global variable                   
  }
  else if(flow == 2){  //verification
      console.log('verification: ');
      fileInput = document.getElementById('encryptedInput');    //store first and only file as global variable  
  } 
  var filePath = fileInput.value;  //var fileItself = fileInput.files[0];
  
   //get the filename firstpart for both safeguarding and verification
   //var fpath = this.value; //https://stackoverflow.com/questions/20323999/how-to-get-file-name-without-extension-in-file-upload-using-java-script?noredirect=1&lq=1
   var fpath = filePath.replace(/\\/g, '/');
   fileName = fpath.substring(fpath.lastIndexOf('/')+1, fpath.lastIndexOf('.'));
   console.log('fname firstpart: ' + fileName);
}

  // input file validation
//https://www.geeksforgeeks.org/file-type-validation-while-uploading-it-using-javascript/
function fileValidation_old(flow) {
  var firstNextButton = document.getElementById("firstnextaction-button");
  var secondNextButton = document.getElementById("secondNextAction-button");

  console.log('fileValidation');
  if(flow == 1){       //safeguarding
      fileInput = document.getElementById('sensitiveInput');    //store first and only file as global variable                   
  }
  else if(flow == 2){  //verification
      console.log('verification: ');
      fileInput = document.getElementById('encryptedInput');    //store first and only file as global variable  
  } 
  var filePath = fileInput.value;  //var fileItself = fileInput.files[0];
  
  // Allowable file types
  var allowedDocExtensions = /(\.doc|\.docx|\.odt|\.pdf|\.tex|\.txt|\.rtf|\.wps|\.wks|\.wpd)$/i;
  var allowedMapExtensions = /(\.zip|\.wpd)$/i;
  var allowedEncryptedExtensions = /(\.enc)$/i;                

   //get the filename firstpart for both safeguarding and verification
   //var fpath = this.value; //https://stackoverflow.com/questions/20323999/how-to-get-file-name-without-extension-in-file-upload-using-java-script?noredirect=1&lq=1
   var fpath = filePath.replace(/\\/g, '/');
   fileName = fpath.substring(fpath.lastIndexOf('/')+1, fpath.lastIndexOf('.'));
   console.log('fname firstpart: ' + fileName);
   
  //validate..safeguarding
  if(flow == 1) {   //if file is document
      //get file extension for documents
      documentExtension = filePath.split('.').pop();
      console.log('documentExtension: (' + documentExtension + ')'); 
        
      if (allowedDocExtensions.exec(filePath)) {  
          console.log('Valid doc filetype');               
          firstNextButton.disabled = false;
          isDocument = true;  console.log('Set isDocument == true'); //set if it's a document or map - as a global variable
          //hide the ''leveltodecrypt' option in decrypt step within the verification flow
          document.getElementById("ChooseVolumeToDecrypt").style.display = "none"; 
      } 
      else if (allowedMapExtensions.exec(filePath)){  //if file is map
          console.log('Valid map filetype');
          firstNextButton.disabled = false;
          document.getElementById("ChooseToEncrypt").style.display = "none"; 
      }
      else { //!allowedDocExtensions.exec(filePath) && !allowedMapExtensions.exec(filePath)			
          alert('Invalid file type x');
          firstNextButton.disabled = true;				
      } 
      
  }
  //in decryption, we cannot know the file type unless we decrypt, so we just make sure the file extension is '.enc'
  else if(flow == 2) { //verification
      //repeat the code from above as .zip is stil not removed during verification
      fileName = fileName.substring(fileName.lastIndexOf('/')+1, fileName.lastIndexOf('.'));
      
      //if file has '.enc' extension
      if (allowedEncryptedExtensions.exec(filePath)) {  
          console.log('Valid encrypted filetype, filePath:' + filePath);               
          secondNextButton.disabled = false; //enable next button
          //hide the 'leveltodecrypt' option in decrypt step within the verification flow
          //document.getElementById("ChooseVolumeToDecrypt").style.display = "none"; 
          
          //lets check if it has the document extension we assigned in the middle of the filename
          filePath = filePath.replace('.enc',''); //remove the '.enc' extension ofr the below checking functions to work
          if (allowedDocExtensions.exec(filePath)) 
              isDocument = true;              
          else
              isDocument = false;
      }
      else {			
          alert('Invalid file type y');
          secondNextButton.disabled = true;	//just making sure, but it should alrady be disabled			
      } 
  }    
}