function toClass(string) {
  return string.toLowerCase().replace(/\W+/g, "-")
}

$(function() {
  var rowTmpl = Handlebars.compile($("#row-template").html())
  var fullTmpl = Handlebars.compile($("#full-template").html())

  var COMMON_COUNT = 15
  var CELL_WIDTH = 50
  $.getJSON("iba-cocktails/recipes.json", function(recipes) {
    var correlation = {}
    _(recipes).each(function(r1) {
      var current = correlation[r1.name] = {}
      _(recipes).filter(function(it) { return it != r1 }).each(function(r2) {
        var common = 0
        _(r1.ingredients)
          .filter(function(it) { return it.ingredient !== undefined })
          .each(function(it) {
            _(r2.ingredients)
              .filter(function(it2) { return it.ingredient === it2.ingredient })
              .each(function(it2) {
                common += Math.min(it.cl, it2.cl)
            })
          })
        current[r2.name] = common
      })
    })
    var ingredients = _(recipes)
      .map(function(r) { return r.ingredients })
      .flatten()
      .filter(function(item) { return typeof(item.special) === "undefined" })
      .map(function(item) { return item.ingredient })
      .countBy()
      .pairs()
      .sortBy(function(ingredient) { return ingredient[1] })
      .reverse()
      .map(function(ingredient, index) { var o = {}; return { name: ingredient[0], count: ingredient[1], position: index } })

    var body = $("body")
    var div = $('<div>')
    var span = $('<span>')
    var row = div.clone().attr("id", "ingredients")
    var titleRow = div.clone().html('&larr; More common - INGREDIENTS - Less common &rarr;').attr('id', 'ingredientHeader')
    body.append(titleRow)
    ingredients.each(function(ing, i) {
      if (i >= COMMON_COUNT)
        return false
      var title = span.clone().html("<span>"+ing.name+"</span>")
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
        var noIngredient = _(recipes).filter(function(it) {
          return _.isUndefined(_(it.ingredients).find(function(it) { return it.ingredient == clickedName }))
        }).map(function(it) { return toClass(it.name) })
        noIngredient.each(function(it) {
          $("."+it).toggle(false)
        })
        $('[title="'+clickedName+'"]').toggleClass('selected')
      })
      row.append(title)
    })
    body.append(row)

    var listed = []
    var previous = null
    _(recipes).each(function(r) {
      if (previous !== null) {
        r = _(recipes).filter(function(it) { return !_.contains(listed, it.name) }).max(function(it) { return correlation[previous.name][it.name] }).__wrapped__
      }
      previous = r
      listed.push(r.name)

      var specials = []
      _(r.ingredients).each(function(ingredient) {
        var name = ingredient.ingredient
        var cl = ingredient.cl
        var offset = _(ingredients).find(function(i) { return i.name === name })
        if (offset === undefined)
          offset = 100
        if (offset.position < COMMON_COUNT) {
          ingredient.offset = 100+(offset.position)*CELL_WIDTH
        }
        else {
          var it = ingredient
          if (it.special !== undefined)
            specials.push(it.special)
          else
            specials.push(it.cl+"cl "+it.ingredient)
        }
      })
      r.specials = specials.join(', ')
      r.className = toClass(r.name)

      ;(function(data) {
        var row = $(rowTmpl(data))
        row.click(function() {
          row.toggleClass('selected')
          row.find('.all').toggle()
          if (row.find('ul.images li').length == 0) {
            var query = "https://ajax.googleapis.com/ajax/services/search/images?v=1.0&q="+data.name+"%20cocktail%20drink&callback=?"
            $.getJSON(query, function(response) {
              data.images = _.pluck(response.responseData.results, 'tbUrl')
              row.append(fullTmpl(data))
            })
          }
        })
        body.append(row)
      })(r)
    })
  })
})
