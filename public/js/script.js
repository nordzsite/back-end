$(() => {
  const l = console.log;
  let form = $("#main");
  form.on("success",(event,response) => {
    form.find(".prompt").html("");
  })
  form.on("error",(event,error) => {
    form.find(".prompt").html(error)
  })
})
