var COMMON_COUNT = 15
var CELL_WIDTH = 50

function toClass(string) {
  return string.toLowerCase().replace(/\W+/g, "-")
}

function ingredientToString(ingredient) {
  return (ingredient.special !== undefined) ? ingredient.special : ingredient.cl+"cl "+ingredient.ingredient
}

$(function() {
  var $body = $("body")

  var templating = (function() {
    var titleTmpl = Handlebars.compile($("#title-template").html())
    var rowTmpl = Handlebars.compile($("#row-template").html())
    var fullTmpl = Handlebars.compile($("#full-template").html())

    return {
      row: function(r) {
        var row = $(rowTmpl(r))
        row.click(function() {
          row.toggleClass('selected')
          row.find('.all').toggle()
          if (row.find('ul.images li').length == 0) {
            var query = "https://ajax.googleapis.com/ajax/services/search/images?v=1.0&q="+r.name+"%20cocktail%20drink&callback=?"
            $.getJSON(query, function(response) {
              r.images = _.pluck(response.responseData.results, 'tbUrl')
              row.append(fullTmpl(r))
            })
          }
        })
        return row
      },
      title: function(ingredients) {
        return titleTmpl(ingredients.first(COMMON_COUNT).value())
      }
    }
  })()

  function calculateCorrelation(recipes) {
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
    return correlation
  }

  function sortRecipes(recipes) {
    var correlation = calculateCorrelation(recipes)
    var listed = []
    var previous = null
    var result = []
    _(recipes).each(function(r) {
      if (previous !== null) {
        r = _(recipes).filter(function(it) { return !_.contains(listed, it.name) }).max(function(it) { return correlation[previous.name][it.name] }).__wrapped__
      }
      previous = r
      listed.push(r.name)
      result.push(r)
    })
    return result
  }

  $.getJSON("iba-cocktails/recipes.json", function(recipes) {
    var sortedIngredients = _(recipes)
      .map(function(r) { return r.ingredients })
      .flatten()
      .filter(function(item) { return typeof(item.special) === "undefined" })
      .map(function(item) { return item.ingredient })
      .countBy()
      .pairs()
      .sortBy(function(ingredient) { return ingredient[1] })
      .reverse()
      .map(function(ingredient, index) { return { name: ingredient[0], count: ingredient[1], position: index } })

    $body.append(templating.title(sortedIngredients))

    $('#ingredients > span').click(function() {
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

    var sortedRecipes = sortRecipes(recipes)
    _(sortedRecipes).each(function(r) {
      var specials = []
      _(r.ingredients).each(function(ingredient) {
        var offset = _(sortedIngredients).find(function(i) { return i.name === ingredient.ingredient })
        if (offset !== undefined && offset.position < COMMON_COUNT)
          ingredient.offset = 100+(offset.position)*CELL_WIDTH
        else
          specials.push(ingredientToString(ingredient))
      })

      r.specials = specials.join(', ')
      r.className = toClass(r.name)

      $body.append(templating.row(r))
    })
  })
})
