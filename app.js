var CELL_WIDTH = 50

function $wrap(i, e) { return $(e) }

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

function highlightCocktails(_recipes) {
  _recipes.each(function(it) {
    $title = it.template.find(".name")
    $title.removeClass("hasAny").removeClass("hasSome").removeClass("hasHalf").removeClass("hasAll")
    if (it.weight == 1.0)
      $title.addClass("hasAll")
    else if (it.weight > 0.6)
      $title.addClass("hasHalf")
    else if (it.weight > 0.3)
      $title.addClass("hasSome")
    else if (it.weight != 0)
      $title.addClass("hasAny")
  })
}

function calculateWeight(_recipes, _selected) {
  _recipes.each(function(it) {
    var total = it.ingredients.length
    var found = _.filter(it.ingredients, function(it) { return _selected.contains(it.ingredient) }).length
    it.weight = found / total
  })
}

function reorderByWeight(_recipes, _selected) {
  var _sortedByWeight = _recipes.sortBy(_selected.size() ? 'weight' : 'originalOrder').reverse()
  var $body = $('#cocktails')
  _sortedByWeight.each(function(it) {
    $body.append(it.template)
  })
}

function updateHighlight(_recipes, _selected) {
  $('span.ingredient').map($wrap).each(function(i, e) {
    var name = e.attr('title')
    var state = _selected.contains(name)
    toggleHighlight($('body'), name, state)
    e.toggleClass('selected', state)
  })
  calculateWeight(_recipes, _selected)
  highlightCocktails(_recipes)
  reorderByWeight(_recipes, _selected)
}

function syncOptions($select, _selected) {
  $select.find('option').map($wrap).each(function(i, e) {
    if (_selected.contains(e.attr('value')))
      e.attr('selected', 'selected')
    else
      e.removeAttr('selected')
  })
  setTimeout(function() { $select.trigger("liszt:updated") }, 0)
}

$(function() {
  var $body = $("body")

  $(window).asEventStream('resize').throttle(300).onValue(resize)

  var templating = (function() {
    var titleTmpl = Handlebars.compile($("#title-template").html())
    var rowTmpl = Handlebars.compile($("#row-template").html())
    var fullTmpl = Handlebars.compile($("#full-template").html())
    var imageTmpl = Handlebars.compile($("#image-template").html())
    var searchTmpl = Handlebars.compile($("#search-template").html())
    var footerTmpl = Handlebars.compile($("#footer-template").html())

    return {
      row: function(r) {
        var $row = $(rowTmpl(r))
        $row.asEventStream('click').onValue(function() {
          if (!$row.find('.all').length) {
            $row.append(fullTmpl(r))
            $row.find('li[title]').map($wrap).each(function(i, $el) {
              var title = $el.attr('title')
              if ($('span.ingredient.selected[title="'+title+'"]').length)
                toggleHighlight($row.find('ul'), title, true) })
          }
          // setTimeout so that append can finish before using .selected
          // to open the appended row
          setTimeout(function() {
            $row.toggleClass('selected')
          }, 0)
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
                thumbStream
                  .scan(0, function(a) { return a+1 })
                  .onValue(function(imagesLoaded) {
                    $row.find('div.images div.bar').css('width', (25 * imagesLoaded)+'%')
                  })
                thumbStream
                  .delay(100)
                  .bufferWithCount(thumbUrls.size())
                  .onValue(function(bufferedImages) {
                    $row.find('div.images').replaceWith(imageTmpl(bufferedImages))
                  })
              })
          }
        })
        return $row
      },
      title: function(ingredients) {
        return titleTmpl(ingredients.value())
      },
      search: function(ingredients) {
        return searchTmpl(ingredients.value())
      },
      footer: function() {
        return footerTmpl()
      }
    }
  })()

  function calculateCorrelation(_recipes) {
    var correlation = {}
    _recipes.each(function(r1) {
      var current = correlation[r1.name] = {}
      _recipes.filter(function(it) { return it != r1 }).each(function(r2) {
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

  function sortRecipes(_recipes) {
    var correlation = calculateCorrelation(_recipes)
    var listed = []
    var previous = null
    var _result = _([])
    var weight = _recipes.size()
    _recipes.each(function(r) {
      if (previous !== null) {
        r = _recipes.filter(function(it) { return !_.contains(listed, it.name) }).max(function(it) { return correlation[previous.name][it.name] }).value()
      }
      previous = r
      listed.push(r.name)
      r.originalOrder = --weight
      _result.push(r)
    })
    return _result
  }

  function extendRecipes(_recipes, sortedIngredients) {
    var ingredientOrderMap = sortedIngredients.map(function(i) { return [i.name, i.position]}).object().value()
    return sortRecipes(_recipes).map(function(it) {
      return _.assign(it, {
        ingredients: _(it.ingredients)
          .map(function(i) { if (i.ingredient) i.offset = 100 + ingredientOrderMap[i.ingredient] * CELL_WIDTH; return i })
          .value(),
        className: toClass(it.name),
        template: templating.row(it)
      })
    })
  }

  var recipeData = Bacon.fromPromise($.getJSON('iba-cocktails/recipes.json'))
  recipeData.onValue(function(recipes) {
    var _recipes = _(recipes)
    var sortedIngredients = _recipes
      .map(function(it) { return it.ingredients })
      .flatten()
      .filter(function(item) { return typeof(item.special) === "undefined" })
      .map(function(item) { return item.ingredient })
      .countBy()
      .pairs()
      .sortBy(function(ingredient) { return ingredient[1] })
      .reverse()
      .map(function(ingredient, index) { return { name: ingredient[0], count: ingredient[1], position: index } })

    _recipes = extendRecipes(_recipes, sortedIngredients)

    $body.append(templating.search(sortedIngredients))
    $body.append(templating.title(sortedIngredients))
    var $cocktails = $('<div id="cocktails"></div>')
    $body.append($cocktails)
    _recipes.each(function(it) { $cocktails.append(it.template) })
    $body.append(templating.footer())

    var $clear = $('#clear')
    var $search = $('#search').chosen()

    var selection = new IngredientSelection()

    function IngredientSelection() {
      this.changes = new Bacon.Bus()
      var selection = this.changes.map(function(it) { return it || [] }).toProperty([])
      selection.map(_).onValue(function(selection) {
        if (selection.size())
          $clear.removeAttr('disabled')
        else
          $clear.attr('disabled', 'disabled')
        updateHighlight(_recipes, selection)
        syncOptions($search, selection)
      })
    }

    $('#search_chzn .chzn-drop, #search_chzn input').css('width', '100%')

    selection.changes.plug($search.asEventStream('change').map(function() { return $search.val() }))
    selection.changes.plug($clear.asEventStream('click').map([]))

    var tabs = $('#ingredients > span').asEventStream('click')
      .map(function(ev) { return $(ev.currentTarget) })
      .map(function($el) {
        var selected = _($('span.ingredient.selected').map(function(i, el) { return $(el).attr('title') }))
        var title = $el.attr('title')
        return $el.hasClass('selected') ? selected.without(title) : selected.push(title)
      })

    selection.changes.plug(tabs)

    resize()
  })
})
