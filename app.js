$(function() {
  var COMMON_COUNT = 20
  var CELL_WIDTH = 50
  $.getJSON("recipes.json", function(recipes) {
    var correlation = {}
    for (var i = 0; i < recipes.length; i++) {
      var current = correlation[recipes[i].name] = {}
      for (var j = 0; j < recipes.length; j++) {
        if (i == j)
          continue
        var common = 0
        _.each(recipes[i].ingredients, function(it) {
          _.each(recipes[j].ingredients, function(it2) {
            if (it.ingredient !== undefined && it.ingredient === it2.ingredient)
              common++
          })
        })
        current[recipes[j].name] = common
      }
    }
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
    var listed = []
    var previous = null
    for (var i = 0; i < recipes.length; i++) {
      var r = recipes[i]
      if (previous !== null)
        r = _.chain(recipes).filter(function(it) { return !_.contains(listed, it.name) }).max(function(it) { return correlation[previous.name][it.name] }).value()
      previous = r
      listed.push(r.name)
      var row = div.clone()
      row.append(span.clone().addClass("name").text(r.name))
      var special = span.clone().addClass("special")
      row.append(special)
      for (var j = 0; j < r.ingredients.length; j++) {
        var name = r.ingredients[j].ingredient
        var cl = r.ingredients[j].cl
        var offset = _.find(ingredients, function(i) { return i.name === name })
        if (offset === undefined)
          offset = 100
        var item = span.clone()
        if (offset.position < COMMON_COUNT) {
          item.css("position", "absolute").css("left", 100+(offset.position)*CELL_WIDTH)
          row.append(item.text(cl + "cl"))
        }
        else {
          var it = r.ingredients[j]
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
