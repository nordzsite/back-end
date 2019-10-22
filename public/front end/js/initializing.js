
//////MODALS///////
document.addEventListener('DOMContentLoaded', function() {
  var elems = document.querySelectorAll('.modal');
  var instances = M.Modal.init(elems, options);
});

// Or with jQuery

$(document).ready(function(){
  $('.modal').modal();
});
///////////////////


//////DROPDOWN//////
document.addEventListener('DOMContentLoaded', function() {
  var elems = document.querySelectorAll('.dropdown-trigger');
  var instances = M.Dropdown.init(elems, options);
});
///////////////////


//////FLOATING BUTTON//////
  document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.fixed-action-btn');
    var instances = M.FloatingActionButton.init(elems, options);
  });
//////////////////////////



//////SELECT//////
  document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('select');
    var instances = M.FormSelect.init(elems, options);
  });
  $(document).ready(function(){
    $('select').formSelect();
  });
////////////////////


/////AUTOCOMPLETE/////
document.addEventListener('DOMContentLoaded', function() {
   var elems = document.querySelectorAll('.autocomplete');
   var instances = M.Autocomplete.init(elems, options);
 });
 $(document).ready(function(){
   $('input.autocomplete').autocomplete({
     data: {
       "Chemistry HL": null,
       "Physics HL": null,
       "Mathematics AA HL": null,
       "Spanish Ab HL": null,
       "Language and Literature SL": null,
       "Economics SL": null
     },
   });
 });
//////////////////////
