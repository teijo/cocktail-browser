function toClass(string) {
  return string.toLowerCase().replace(/\W+/g, "-")
}

$(function() {
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
      var row = div.clone().addClass("cocktail").addClass(toClass(r.name))
      row.append(span.clone().addClass("name").text(r.name))
      var all = div.clone().addClass("all")
      var ul = $('<ul class="ingredients">')
      var li = $('<li>')
      _(r.ingredients).each(function(ingredient) {
        var item
        if (ingredient.special !== undefined)
          item = ingredient.special
        else
          item = ingredient.cl+"cl "+ingredient.ingredient
        ul.append(li.clone().append(item).attr('title', ingredient.ingredient))
      })
      all.append($('<span class="glass '+r.glass+'"></span>'))
      all.append(ul)
      if (r.preparation !== undefined)
        all.append('<div class="preparation">'+r.preparation+'</div>')

      all.append('<ul class="images"></ul>')
      row.append(all)
      var special = span.clone().addClass("special")
      var specials = []
      _(r.ingredients).each(function(ingredient) {
        var name = ingredient.ingredient
        var cl = ingredient.cl
        var offset = _(ingredients).find(function(i) { return i.name === name })
        if (offset === undefined)
          offset = 100
        var item = span.clone()
        if (offset.position < COMMON_COUNT) {
          item.css("position", "absolute").css("left", 100+(offset.position)*CELL_WIDTH)
          item.attr('title', name)
          row.append(item.addClass("cl").text(cl))
        }
        else {
          var it = ingredient
          if (it.special !== undefined)
            specials.push(it.special)
          else
            specials.push(it.cl+"cl "+it.ingredient)
        }
      })
      if (specials.length > 0)
        special.append('+ ')
      special.append(specials.join(', '))
      row.append(special)
      row.click(function() {
        $(this).toggleClass('selected')
        $(this).find('.all').toggle()
        var that = $(this).find('ul.images')
        if (that.html() === "")
          var searchQuery = r.name+" cocktail drink"
          $.getJSON("https://ajax.googleapis.com/ajax/services/search/images?v=1.0&q="+searchQuery+"&callback=?",
            function(data) {
              _(data.responseData.results).each(function(img) {
                $('<li>').append($("<img/>").attr("src", img.tbUrl)).appendTo(that)
              });
              return false;
            });
      })
      body.append(row)
    })
  })
})
