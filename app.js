function toClass(string) {
  return string.toLowerCase().replace(/\W+/g, "-")
}

$(function() {
  var COMMON_COUNT = 15
  var CELL_WIDTH = 50
  $.getJSON("iba-cocktails/recipes.json", function(recipes) {
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
              common += Math.min(it.cl, it2.cl)
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
    var row = div.clone().attr("id", "ingredients")
    var titleRow = div.clone().text('Common ingredients').attr('id', 'ingredientHeader')
    body.append(titleRow)
    for (var i = 0; i < ingredients.length && i < COMMON_COUNT; i++) {
      var title = span.clone().html("<span>"+ingredients[i].name+"</span>")
      title.click(function() {
        var clickedName = $(this).text()
        $('div.cocktail').toggle(true)
        $('span.cl, li').toggleClass('selected', false)
        if ($(this).hasClass("selected")) {
          $(this).toggleClass("selected")
          return
        }
        $('#ingredients span').removeClass('selected')
        $(this).toggleClass("selected")
        var noIngredient = _.filter(recipes, function(it) {
          return _.chain(it.ingredients).find(function(it) { return it.ingredient == clickedName }).isUndefined().value()
        }).map(function(it) { return toClass(it.name) })
        _.each(noIngredient, function(it) {
          $("."+it).toggle(false)
        })
        $('[title="'+clickedName+'"]').toggleClass('selected')
      })
      row.append(title)
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
      var row = div.clone().addClass("cocktail").addClass(toClass(r.name))
      row.append(span.clone().addClass("name").text(r.name))
      var all = div.clone().addClass("all")
      var ul = $('<ul>')
      var li = $('<li>')
      for (var j = 0; j < r.ingredients.length; j++) {
        var item
        var it = r.ingredients[j]
        if (it.special !== undefined)
          item = it.special
        else
          item = it.cl+"cl "+it.ingredient
        ul.append(li.clone().append(item).attr('title', it.ingredient))
      }
      all.append(ul)
      if (r.preparation !== undefined)
        all.append('<div class="preparation">'+r.preparation+'</div>')
      row.append(all)
      var special = span.clone().addClass("special")
      var specials = []
      for (var j = 0; j < r.ingredients.length; j++) {
        var name = r.ingredients[j].ingredient
        var cl = r.ingredients[j].cl
        var offset = _.find(ingredients, function(i) { return i.name === name })
        if (offset === undefined)
          offset = 100
        var item = span.clone()
        if (offset.position < COMMON_COUNT) {
          item.css("position", "absolute").css("left", 100+(offset.position)*CELL_WIDTH)
          item.attr('title', name)
          row.append(item.addClass("cl").text(cl))
        }
        else {
          var it = r.ingredients[j]
          if (it.special !== undefined)
            specials.push(it.special)
          else
            specials.push(it.cl+"cl "+it.ingredient)
        }
      }
      if (specials.length > 0)
        special.append('+ ')
      special.append(specials.join(', '))
      row.append(special)
      row.click(function() {
        $(this).toggleClass('selected')
        $(this).find('.all').toggle()
      })
      body.append(row)
    }
  })
})
