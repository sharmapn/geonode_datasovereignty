//Prepares data and calls OpenPGP Enryption and Decryption 
//These functions are called directly from html. Thus, is independent of, and no need to involve dstool.js script. 
//Layer_Uploads.html calls 'callOpenPGPEncrypt' and Comments.html calls 'callOpenPGPDecrypt' for decrption

var decryptedGEOJSON; //once decrypted, hold the geojson 

var to_encrypt_users_array; //global array to hold the selected users in the combo box for encryption 

var fileToEncrypt;

//This is the public key of the test user 'aihe' which will be used for openpgp encryption 
const publicKey_aihe = `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP.js v4.10.10
Comment: https://openpgpjs.org

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
=DCgM
-----END PGP PUBLIC KEY BLOCK-----`; 

// Creates the zip file and calls OpenPGP encryption. In tyhe OpenPGP approach, there is only single level encryption 
// For OpenPGP, encrypt the original layer - the unmasked one - and zip that with some text files   
async function callOpenPGPEncrypt()  { //v_ciphertextInFile, levelToDecrypt, currentLevel){ //v_objFile
  console.log("Inside callOpenPGPEncrypt() function ");
  var downloadFile = true;
  var level = 1;  //in OpenPGP there is only one level encryption, so save after that 
  var originalmap_jsonString = JSON.stringify(sensitive.data, circularReplacer());
  global_originalmap_jsonString = originalmap_jsonString;
  //for the below functions, currently we are using the same passphrase - from textbox in the form. This will change
      
  //encrypt the shapefile
  OpenPGPEncryptData_ZipFile(fileToEncrypt, downloadFile, level); 
  
  //stop the spinner
  $(".loading-icon").addClass("hide");
  $(".button").attr("disabled", false);
  $(".btn-txt-enc").text("Encrypt"); 
}

//parameter 'level' is not used
async function OpenPGPEncryptData_ZipFile(zipBlob, downloadFile, level) 
{   
  var startTime = new Date();
  console.log("OpenPGP EncryptData ZipFile");      
  const publicKey1 = textFromFileLoaded;  //This is my public key
  console.log('textFromFileLoaded' + textFromFileLoaded) 
  
  //$$$ key1 to key2
  const publicKeysArmored = [publicKey1, publicKey_aihe]; 
  //Now all the users keys are retrieved from the database using javascript
   
  //create a combined key
  const publicKeys = await Promise.all(publicKeysArmored.map(armoredKey => openpgp.readKey({ armoredKey }))); 

  //var binaryData = new Uint8Array(zipBlob);  
  var binaryData = new Uint8Array(await zipBlob.arrayBuffer());
        //{data: encrypted} // or const { message }//or encrypted
  const  encrypted  = await openpgp.encrypt({
    message: await openpgp.createMessage({ binary: binaryData }),      //({ text: 'Hello, World!' }), // input as Message object
    encryptionKeys: publicKeys,
    //signingKeys: privateKey // optional
    format: 'binary'
  });

  var endTime = new Date(); 
  var difference = (endTime - startTime) / 1000;
  console.log("OpenPGP Encryption Time : " + difference + " seconds");

  var encryptedBlob = new Blob([encrypted],{type: 'text/plain'}); //{type: 'text/plain'} );  //cipherbytes   
    
  // store it as global variable so that it can later be sent to geonode document endpoint
  global_finalEncryptedZipFile = encryptedBlob; 
  finalFilename = fileName + ".zip" + ".enc";  //finalFilename is a global variable which will be soon used to upload the document
  if (downloadFile){
    saveAs(encryptedBlob, finalFilename ); 
    console.log('encrypted file saved: ' + finalFilename ); 
  }
  
  //compute hash of the final encrypted volume file (level 3).
  //https://stackoverflow.com/questions/21761453/create-sha-256-hash-from-a-blob-file-in-javascript
  const hashHex = await getHash("SHA-256", encryptedBlob)
  hash_value = hashHex;          //finally UPDATE THE GLOBAL VARIABLE 'HASH'
  console.log('hashHex: ' + hashHex);
  waitingDialog.hide(); 
  
}

//modified version of the recursive decrypt function to call OpenPGP as we now only have single level encryption 
async function callOpenPGPDecrypt_zipFile(encrypted_Blob, levelToDecrypt, currentLevel){ //v_objFile
  console.log("Inside callOpenPGPDecrypt() function ");
  console.log("Decryption levelToDecrypt "+  levelToDecrypt + " currentLevel " + currentLevel); 
  
  console.log('Decrypting encrypted Layer using OpenPGP');
  
  waitingDialog.show('Decrypting Layer...',{	  
				progressType: 'danger'
	  }); 

  var downloadFile = false;
  if (currentLevel == levelToDecrypt)
      downloadFile = true;

  downloadFile = true;
  var binaryData = new Uint8Array(await encrypted_Blob.arrayBuffer());
  //for zip files                             
  let decrypted_file_data = await decryptOpenPGP(binaryData, currentLevel, downloadFile); //cipherbytes//will automatically use the 'objFile' global variable
 
   return decrypted_file_data;
}

//OpenPGP decrypt function .for zip files
//First argument trials: encrypted_maskedData, cipherTextInFile, //encrypted, encryptedZIPBlob
async function decryptOpenPGP(binaryData, currentLevel, downloadFile) //cipherbytes
{    
  var startTime = new Date();
  // put keys in backtick (``) to avoid errors caused by spaces or tabs
  //Retrieve user's uploaded public key
  const privkey = textFromFileLoaded; 
  console.log('privkey: ' + privkey);
  const passphrase = document.getElementById("pass").value
  console.log('passphrase: ' + passphrase)
   
  const privKeyObj = ( await openpgp.readKey( { armoredKey: privkey } ) .catch( (err) => 
  { 
    console.log(err);
  } ) ); //.keys[0]
    
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({ armoredKey: privkey }), 
    passphrase
  });
  console.log('Completed decryption of private key')
    
  const { data: decrypted } = await openpgp.decrypt({
    message: await openpgp.readMessage({ binaryMessage: binaryData }),    
    decryptionKeys: privateKey,   
    format: 'binary'
  }).catch(function(error){
    console.log('Error decrypting');
    alert('Error decrypting');
  }); 
  
  decryptedZipFile = decrypted;  
  unzipFile_DisplayMap(decryptedZipFile)
    
  var endTime = new Date(); 
  var difference = (endTime - startTime) / 1000;
  console.log("OpenPGP Decryption Time : " + difference + " seconds");


  if(downloadFile) { //we only download/display link at the right level
    //save the blob file https://github.com/eligrey/FileSaver.js/issues/357        
    var decryptedBlob = new Blob([decrypted],{type: 'text/plain'} ); // save as Blob 
    var fileName2 = fileName + ".zip";
    saveAs(decryptedBlob, fileName2); 
    console.log('Decrypted file saved, filename: ' + fileName2)  
  } 
  waitingDialog.hide();
  return binaryData; //plaintextbytes;
}

function unzipFile_DisplayMap(decrypted_file_data){
    //`big encrypted zip file' is encrypted. So here we Decrypt it into file content into fileobject so we can iterate over each file
    var file = new File([decrypted_file_data], "decrypted.txt", {
      type: "text/plain",
    });
    v_objFile = file; //assign to variable used below

    //From the decrypted zip file object, we unzip each file 
    console.log("Unzipping now: "); 
    var jsZip = new JSZip();
    var fileNum =0;
    jsZip.loadAsync(v_objFile).then(function (zip) {
        Object.keys(zip.files).forEach(function (filename){
            //now we iterate over each zipped file 
            zip.files[filename].async('string').then(function (fileData){
                console.log("\t filename: " + filename);                             
                    //if found the shapefile file and this is the level of which we want to show/decrypt the volume                
                if (filename.endsWith('.zipR') == true){ 
                    console.log("\t file to decrypt: " + filename); // decrypt the file here                     
                    //decrypt the encrypted volume at that level, display and allow user to save the decrypted file
                    
                    console.log("\t For verification. We can display the map here");                            
                    //create a file out of the `decrypted_file_data' variable
                    decryptedGEOJSON = fileData;
                    
                    //refer to 'multiLevelDecrypt' function in dstools.js file in mapsafe for much commented code in this block
                    zip.file(filename).async('blob').then( (blob) => { 
                        console.log("Downloading File") 
                        const buffer = new Response(blob).arrayBuffer();
                        
                        (async () => {
                            const buf = await blob.arrayBuffer();
                            console.log( buf.byteLength ); // 5
                            
                            //create geojson from shapefile for diplay during verification. Should only create a geojson from shapefile, as below. 
                            //However, as shapefile is a zip file, while decrypting there are two sets of zip files (the shapefile and 
                            //the (decrypted) zip file). Thus, until a way to differentiate between the two is found, we have to store a geojson along for display later on
                            shp(buf).then(function (geojson) {
                                console.log(" Loaded geojson "); 
                                    sensitive.data  = JSON.stringify(geojson); 
                                    console.log('sensitive.data 2 '+ sensitive.data )                                    
                            });
                          })();    
                    }); 
                    console.log("Called loadShapeFile")                    
                }
                if (filename.endsWith('.geojson') == true){ 
                    zip.file(filename).async('string').then( (str) => {                           
                        $("#sensitiveTag").html("sensitive.data = " + str + ";");    
                        decryptedGEOJSON = str;
                    });
                }
                //contents of the metadata txt file
                if (filename.endsWith('.txt') == true){
                    //console.log("\t txtfile contents: " + filename); 
                }                
            })           
        })
    }).catch(err => window.alert(err)) 

}

function convertStringToArrayBuffer(str) {
  var encoder = new TextEncoder("utf-8");
  return encoder.encode(str);
}
function convertArrayBuffertoString(buffer) {
  var decoder = new TextDecoder("utf-8");
  return decoder.decode(buffer);
}

