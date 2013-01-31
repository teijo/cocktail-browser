var CELL_WIDTH = 50

function toClass(string) {
  return string.toLowerCase().replace(/\W+/g, "-")
}

function ingredientToString(ingredient) {
  return (ingredient.special !== undefined) ? ingredient.special : ingredient.cl+"cl "+ingredient.ingredient
}

function resize() {
  var width = $(window).width()
  var remainder = width % 50
  $('#ingredients').css('width', width-remainder-100)
  $('.ingredients').css('width', width-remainder)
}

function toggleHighlight($el, name, state) {
  var match = $el.find('[title="'+name+'"]')
  match.toggleClass('selected', state)
}

var selected = _([])

function highlightCocktails(recipes) {
  _(recipes).each(function(it) {
    var $title = $(".cocktail."+it.className+" .name")
    $title.removeClass("hasSome").removeClass("hasHalf").removeClass("hasAll")
    if (it.weight == 1.0)
      $title.addClass("hasAll")
    else if (it.weight > 0.6)
      $title.addClass("hasHalf")
    else if (it.weight > 0.3)
      $title.addClass("hasSome")
  })
}

function calculateWeight(recipes, selected) {
  _(recipes).each(function(it) {
    var total = it.ingredients.length
    var found = _.filter(it.ingredients, function(it) { return selected.contains(it.ingredient) }).length
    it.weight = found / total
  })
}

function reorderByWeight(recipes, selected) {
  var sortedByWeight = _.sortBy(recipes, selected.size() ? 'weight' : 'originalOrder').reverse()
  var $body = $('body')
  _.each(sortedByWeight, function(it) {
    $body.append($('div.cocktail.'+toClass(it.name)))
  })
}

function selectIngredient($button, name, recipes) {
  var isSelected = $button.hasClass('selected')
  if (isSelected)
    selected = selected.reject(function(it) { return name == it })
  else
    selected.push(name)
  toggleHighlight($('body'), name, !isSelected)
  $button.toggleClass("selected")
  calculateWeight(recipes, selected)
  highlightCocktails(recipes)
  reorderByWeight(recipes, selected)
}

$(function() {
  var $body = $("body")

  $(window).asEventStream('resize').throttle(300).onValue(resize)

  var templating = (function() {
    var titleTmpl = Handlebars.compile($("#title-template").html())
    var rowTmpl = Handlebars.compile($("#row-template").html())
    var fullTmpl = Handlebars.compile($("#full-template").html())
    var imageTmpl = Handlebars.compile($("#image-template").html())

    return {
      row: function(r) {
        var $row = $(rowTmpl(r))
        $row.asEventStream('click').onValue(function() {
          $row.toggleClass('selected')
          $row.find('.all').toggle()
          if (!$row.find('.all').length) {
            $row.append(fullTmpl(r))
            selected.each(function(it) { toggleHighlight($row.find('.all'), it, true) })
          }
          if (!$row.find('ul.images li').length) {
            var query = "https://ajax.googleapis.com/ajax/services/search/images?v=1.0&q="+r.name+"%20cocktail%20drink&callback=?"
            Bacon.fromPromise($.getJSON(query))
              .filter(function(response) { return response.responseData != null })
              .map(function(response) { return _(response.responseData.results).pluck('tbUrl') })
              .onValue(function(thumbUrls) {
                var thumbStream = new Bacon.Bus()
                thumbUrls.each(function(it) {
                  var img = new Image()
                  img.onload = function() { thumbStream.push(it) }
                  img.src = it
                })
                thumbStream.bufferWithCount(thumbUrls.size()).onValue(function(bufferedImages) {
                  $row.find('div.images').replaceWith(imageTmpl(bufferedImages))
                })
              })
          }
        })
        return $row
      },
      title: function(ingredients) {
        return titleTmpl(ingredients.value())
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
    var weight = recipes.length
    _(recipes).each(function(r) {
      if (previous !== null) {
        r = _(recipes).filter(function(it) { return !_.contains(listed, it.name) }).max(function(it) { return correlation[previous.name][it.name] }).__wrapped__
      }
      previous = r
      listed.push(r.name)
      r.originalOrder = --weight
      result.push(r)
    })
    return result
  }

  var recipeData = Bacon.fromPromise($.getJSON('iba-cocktails/recipes.json'))
  recipeData.onValue(function(recipes) {
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

    var ingredientOrderMap = sortedIngredients.map(function(i) { return [i.name, i.position]}).object().value()

    $('#ingredients > span').each(function(i, el) {
      var $el = $(el)
      $el.asEventStream('click').onValue(function() {
        selectIngredient($el, $el.text(), recipes)
      })
    })

    var sortedRecipes = sortRecipes(recipes)
    _(sortedRecipes).each(function(r) {
      r.ingredients = _(r.ingredients)
        .map(function(i) { if (i.ingredient) i.offset = 100 + ingredientOrderMap[i.ingredient] * CELL_WIDTH; return i })
        .value()

      r.className = toClass(r.name)

      $body.append(templating.row(r))
    })

    resize()
  })
})
