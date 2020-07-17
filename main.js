//electron has two properties app and browserWindow
const { app, BrowserWindow } = require('electron');
//templating library ejs
const ejse  = require('ejs-electron');

//defining variables for index.ejs #grid
ejse.data({
    rows : '100',
    columns : '26'
})

//defining property of window 
function createWindow(){
    const win = new BrowserWindow({
        width :800,
        height: 800,
        show : false,
        webPreferences : {

            nodeIntegration : true
        }
    });

    //loading ejs file in app
    win.loadURL('file://'+ __dirname + '/index.ejs').then(function (){
        win.removeMenu();
        win.maximize();
        win.show();
    });
}

//open app when ready 
app.whenReady().then(createWindow);













//for mac
// app.on('window=all-closed', () => {
//     if(process.platform !== 'darwin'){
//         app.quit();
//     }
// })
// app.on('activate', ()=>{
//     if(BrowserWindow.getAllWindows().length===0){
//         createWindow()
//     }
// }) 