$(function() {
  var COMMON_COUNT = 20
  var CELL_WIDTH = 50
  $.getJSON("recipes.json", function(recipes) {
    var ingredients = _.chain(recipes)
      .map(function(r) { return r.ingredients })
      .flatten()
      .filter(function(item) { return typeof(item.special) === "undefined" })
      .map(function(item) { return item.ingredient })
      .countBy()
      .pairs()
      .sortBy(function(ingredient) { return ingredient[1] })
      .reverse()
      .map(function(ingredient, index) { var o = {}; return { name: ingredient[0], count: ingredient[1], position: index } })
      .value()

    var body = $("body")
    var div = $('<div>')
    var span = $('<span>')
    var row = div.clone()
    row.append(span.clone().addClass('name').text("Ingredients"))
    for (var i = 0; i < ingredients.length && i < COMMON_COUNT; i++) {
      row.append(span.clone().text(ingredients[i].name))
    }
    body.append(row)
    for (var i = 0; i < recipes.length; i++) {
      var row = div.clone()
      row.append(span.clone().addClass("name").text(recipes[i].name))
      var special = span.clone().addClass("special")
      row.append(special)
      for (var j = 0; j < recipes[i].ingredients.length; j++) {
        var name = recipes[i].ingredients[j].ingredient
        var cl = recipes[i].ingredients[j].cl
        var offset = _.find(ingredients, function(i) { return i.name === name })
        if (offset === undefined)
          offset = 100
        var item = span.clone()
        if (offset.position < COMMON_COUNT) {
          item.css("position", "absolute").css("left", 100+(offset.position)*CELL_WIDTH)
          row.append(item.text(cl + "cl"))
        }
        else {
          var it = recipes[i].ingredients[j]
          if (it.special !== undefined)
            special.append(it.special)
          else
            special.append(it.cl+"cl "+it.ingredient+",")
        }
      }
      body.append(row)
    }
  })
})
