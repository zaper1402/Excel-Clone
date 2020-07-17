const $ = require('jquery');
const { rawListeners } = require('process');
const electron = require('electron').remote;
const dialog  = electron.dialog;
const fsp = require('fs').promises;


$(document).ready(function(){
    let rows=[];

    //function to create default property of cell 
    function getDefaultCell(){
        let cell = {
            val: '',
            fontFamily : 'Georgia',
            fontSize: '10',
            bold : false,
            italic : false,
            underline : false,
            bgColor: '#FFFFFF',
            txtColor: '#000000',
            valing : 'middle',
            halign : 'center',
            formula : '',
            upstream : [] ,
            downstream : []
        };
        return cell;
    }

    //function to read the cell properties and define a css in 'cdiv'
    function makeCellDiv(cdiv, cobj){
        $(cdiv).html(cobj.val);
        $(cdiv).css('font-family',cobj.fontFamily);
        $(cdiv).css('font-size',`${cobj.fontSize} px`);
        $(cdiv).css('font-weight',cobj.bold? 'bold':'normal');
        $(cdiv).css('font-style',cobj.italic? 'italic':'normal');
        $(cdiv).css('text-decoration',cobj.underline? 'underline':'none');
        $(cdiv).css('background-color',cobj.bgColor);
        $(cdiv).css('color',cobj.txtColor);
        $(cdiv).css('text-align',cobj.halign);

    }

    //function to fetch values of variables in formula from upstream
    function evalFormula(cobj){
        let formula=cobj.formula;
            for(let i=0;i<cobj.upstream.length;i++){
                let uso = cobj.upstream[i];
                let fuso = rows[uso.rid][uso.cid];
                let cellName = String.fromCharCode(uso.cid+'A'.charCodeAt(0)) + (uso.rid);
                formula = formula.replace(cellName, fuso.val || 0);
            }

            //evaluate
            return eval(formula);
    }

    //deleting obj from upstream members: downstream  
    function deleteFormula(rid,cid){
        let cobj = rows[rid][cid];
        cobj.formula='';

            for(let i=0;i < cobj.upstream.length;i++){
                let uso = cobj.upstream[i];
                //delete from downstream
                let fuso = rows[uso.rid][uso.cid];
                for(let j=0;j<downstream.length;j++){
                    let dso = fuso.downstream[j];
                    if(dso.rid == rid && dso.cid ==cid){
                        fuso.downstream.splice(j,1);
                        break;
                    }
                }
            }
            cobj.upstream = [];
    }

    //recursive call to update the changes in all its downstream members
    function updateVal(rid,cid,val,render){
        let cobj = rows[rid][cid];
        cobj.val = val;
        if(render){
            $(`.cell[rid= ${rid}][cid= ${cid}]`).html(val);
        }

        for(let i=0;i<cobj.downstream.length;i++){
            let dso = cobj.downstream[i];
            let fdso = rows[dso.rid][dso.cid];
            
            let nval = evalFormula(fdso);
            updateVal(dso.rid,dso.cid,nval,true);
        }
    }

    //function to setup formula upstream and downstream
    function setUpFormula(rid,cid,formula){
        let cobj = rows[rid][cid];
        cobj.formula=formula;
            
            //set upstream for cobj and updating the upstream members - downstream array with cobj
            formula = formula.replace('(','').replace(')','');
            let comps = formula.split(' ');
            for(let i=0;i<comps.length;i++){
                if(comps[i].charCodeAt(0) >= "A".charCodeAt(0) && comps[i].charCodeAt(0) <= 'Z'.charCodeAt(0) ){
                    let urid = parseInt(comps[i].substr(1));
                    let ucid = comps[i].charCodeAt(0) -"A".charCodeAt(0);
                    cobj.upstream.push({
                        rid : urid,
                        cid : ucid
                    })

                    let fuso = rows[urid][ucid];
                    fuso.downstream.push({
                        rid: rid,
                        cid: cid
                    })
                }
            }
    }

    //fixing the postion of top-row , first-col and the tl cell
    $('#content-box').on('scroll',function(){
        $('#first-row').css('top', $('#content-box').scrollTop());
        $('#first-col').css('left', $('#content-box').scrollLeft());
        $('#tl-cell').css('top', $('#content-box').scrollTop());
        $('#tl-cell').css('left', $('#content-box').scrollLeft());

    })

    //Fn for 'New' option in file menu  
    $("#new").on('click', function(){
        //for each loop on row
        rows=[]
        $('#grid').find('.row').each(function(){
            let cells = [];
            //for each loop on cell
            $(this).find('.cell').each(function(){
                let cell = getDefaultCell();
                cells.push(cell);
                makeCellDiv(this, cell);
            })
            rows.push(cells);
        })

        $('#grid .cell:first').click();
        $('#home-Menu').click();
    })

    //Fn for 'open' option in file menu  
    $("#open").on('click', async function(){
        let dobj = await dialog.showOpenDialog();
        let data = await fsp.readFile(dobj.filePaths[0]);
        rows = JSON.parse(data);
        
        let i=1;
        $('#grid').find('.row').each(function(){
            let j=0;
            $(this).find('.cell').each(function(){
                let cell = rows[i][j];
                makeCellDiv(this,cell);
                j++;
            }) 
            i++; 
        })

        $('#grid .cell:first').click();
        $('#home-Menu').click();
    })

    //Fn for 'save' option in file menu  
    $("#save").on('click', async function(){
        let dobj = await dialog.showSaveDialog();
        let data = JSON.stringify(rows);
        await fsp.writeFile(dobj.filePath, data );
        alert('Saved Succesfully'); 
        $('#home-Menu').click();
    })

    //hide and reveal of selected menu bar
    $("#menu-bar > div").on('click' , function(){
        $('#menu-bar > div').removeClass('selected');
        $(this).addClass('selected');

        let menuContainerId = $(this).attr('data-content');
        $('#menu-content-container > div').css('display','none');
        $(`#${menuContainerId}`).css('display', 'flex');
    })
    $('#font-family-dd').on('click',function(){
        let fontFamily = $(this).val();
        $('#grid .cell.selected').each( function(){
            $(this).css('font-family', fontFamily);
            let rid =parseInt($(this).attr('rid'),10);
            let cid =parseInt($(this).attr('cid'),10);
            let cobj = rows[rid][cid];
            cobj.fontFamily = fontFamily;
        })
    })
    $('#font-size-dd').on('click',function(){
        let fontSize = $(this).val();
        $('#grid .cell.selected').each( function(){
            $(this).css('font-size', fontSize + 'px');
            let rid =parseInt($(this).attr('rid'),10);
            let cid =parseInt($(this).attr('cid'),10);
            let cobj = rows[rid][cid];
            cobj.fontSize = fontSize;
        })
    })

    //bold,italics,underline css effect for selected
    $('#bold').on('click', function(){
        $(this).toggleClass('selected');
        let bold = $(this).hasClass('selected');
        $('#grid .cell.selected').each( function(){
            $(this).css('font-weight',bold? 'bold':'normal');
            let rid =parseInt($(this).attr('rid'),10);
            let cid =parseInt($(this).attr('cid'),10);
            let cobj = rows[rid][cid];
            cobj.bold = bold;
        })
    })
    $('#italics').on('click', function(){
        $(this).toggleClass('selected');
        let italics = $(this).hasClass('selected');
        $('#grid .cell.selected').each( function(){
            $(this).css('font-style',italics ? 'italic':'normal');
            let rid =parseInt($(this).attr('rid'),10);
            let cid =parseInt($(this).attr('cid'),10);
            let cobj = rows[rid][cid];
            cobj.italic = italics;
        })
    })
    $('#underline').on('click', function(){
        $(this).toggleClass('selected');
        let underline = $(this).hasClass('selected');
        $('#grid .cell.selected').each( function(){
            $(this).css('text-decoration', underline ? 'underline':'none');
            let rid =parseInt($(this).attr('rid'),10);
            let cid =parseInt($(this).attr('cid'),10);
            let cobj = rows[rid][cid];
            cobj.underline = underline;
        })
    })
    $('#bg-color').on('change', function(){
        let bgColor = $(this).val();
        $('#grid .cell.selected').each( function(){
            $(this).css('background-color',bgColor);
            let rid =parseInt($(this).attr('rid'),10);
            let cid =parseInt($(this).attr('cid'),10);
            let cobj = rows[rid][cid];
            cobj.bgColor = bgColor;
        })
    })
    $('#txt-color').on('change', function(){
        let txtColor = $(this).val();
        $('#grid .cell.selected').each( function(){
            $(this).css('color',txtColor);
            let rid =parseInt($(this).attr('rid'),10);
            let cid =parseInt($(this).attr('cid'),10);
            let cobj = rows[rid][cid];
            cobj.txtColor = txtColor;
        })
    })



    //css effect on 'valign' and 'halign' buttons selected
    $('.valign').on('click', function(){
        $('.valign').removeClass('selected');
        $(this).addClass('selected');
    })
    $('.halign').on('click', function(){
        $('.halign').removeClass('selected');
        $(this).addClass('selected');

        let halign = $(this).attr('prop-val');
        $('#grid .cell.selected').each( function(){
            $(this).css('text-align',halign);
            let rid =parseInt($(this).attr('rid'),10);
            let cid =parseInt($(this).attr('cid'),10);
            let cobj = rows[rid][cid];
            cobj.halign = halign;
        })
    })

    //'CTRL' select option and matching menu container with the cell properties
    $('#grid .cell').on('click',function(e){
        if(e.ctrlKey){
                $(this).addClass('selected');
        } else {
            $('#grid .cell').removeClass('selected');
            $(this).addClass('selected');
        }

        let rid =parseInt($(this).attr('rid'),10);
        let cid =parseInt($(this).attr('cid'),10);
        let cobj = rows[rid][cid];

        $('#font-family-dd').val(cobj.fontFamily);
        $('#font-size-dd').val(cobj.fontSize);

        if(cobj.bold){
            $('#bold').addClass('selected');
        } else {
            $('#bold').removeClass('selected');
        }

        if(cobj.italic){
            $('#italics').addClass('selected');
        } else {
            $('#italics').removeClass('selected');
        }

        if(cobj.underline){
            $('#underline').addClass('selected');
        } else {
            $('#underline').removeClass('selected');
        }
        
        $('#bg-color').val(cobj.bgColor);
        $('#txt-color').val(cobj.txtColor);
        $('.halign').removeClass('selected');
        $('.halign[prop-val=' + cobj.halign +']').addClass('selected');

        $('#cellFormula').val(String.fromCharCode(cid+65) + (rid));
        $('#formulaTxt').val(cobj.formula);

    })

    //updating live changes on each cell
    $('#grid .cell').on('keyup',function(e){
        let rid =parseInt($(this).attr('rid'),10);
        let cid =parseInt($(this).attr('cid'),10);
        let cobj = rows[rid][cid];
        cobj.val = $(this).html();

        if(cobj.formula){
            //empty the formula text
            $('#formulaTxt').val('');
            //delete the formula dependency
            deleteFormula(rid,cid);
        }
        //update value 
        updateVal(rid,cid,$(this).html(),false);
    })
    
    //move from formula bar after feeding formula
    $('#formulaTxt').on('blur', function(){
        let formula = $(this).val();

        $('#grid .cell.selected').each(function(){
            let rid =parseInt($(this).attr('rid'),10);
            let cid =parseInt($(this).attr('cid'),10);
            let cobj = rows[rid][cid];

            if(cobj.formula){
                // $('#formulaTxt').val('');
                deleteFormula(rid,cid);
            }
            //set upstream-dwnstream
            setUpFormula(rid,cid,formula)
            //-> check for cycle
            let nval = evalFormula(cobj);
            updateVal(rid,cid,nval,true);
    
        });
    })

    $('#new').click();
    

})