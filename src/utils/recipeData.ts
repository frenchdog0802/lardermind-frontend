import { RecipeSuggestion } from '../api/types';
export const recipeSuggestions: RecipeSuggestion[] = [{
  id: '1',
  name: "Spaghetti Aglio e Olio",
  image: "https://images.unsplash.com/photo-1589227365533-cee630bd59bd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
  cookTime: 20,
  difficulty: "Easy",
  ingredients: [{
    name: "spaghetti",
    quantity: 200,
    unit: "g"
  }, {
    name: "garlic",
    quantity: 4,
    unit: "cloves"
  }, {
    name: "olive oil",
    quantity: 60,
    unit: "ml"
  }, {
    name: "red pepper flakes",
    quantity: 1,
    unit: "tsp"
  }, {
    name: "parsley",
    quantity: 2,
    unit: "tbsp"
  }],
  instructions: ["Bring a large pot of salted water to a boil and cook spaghetti according to package directions until al dente.", "While pasta cooks, slice garlic thinly and heat olive oil in a large skillet over medium heat.", "Add garlic to the oil and cook until golden, about 2 minutes. Add red pepper flakes.", "Drain pasta, reserving 1/4 cup of pasta water.", "Add pasta to the skillet along with the reserved pasta water and toss to coat.", "Sprinkle with chopped parsley and serve immediately."],
  swaps: [{
    original: "parsley",
    alternative: "basil or cilantro"
  }, {
    original: "red pepper flakes",
    alternative: "black pepper"
  }]
}, {
  id: '2',
  name: "Simple Veggie Omelet",
  image: "https://images.unsplash.com/photo-1510693206972-df098062cb71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
  cookTime: 15,
  difficulty: "Easy",
  ingredients: [{
    name: "eggs",
    quantity: 3,
    unit: ""
  }, {
    name: "bell pepper",
    quantity: 1 / 2,
    unit: ""
  }, {
    name: "onion",
    quantity: 1 / 4,
    unit: ""
  }, {
    name: "cheese",
    quantity: 30,
    unit: "g"
  }, {
    name: "salt",
    quantity: 1 / 4,
    unit: "tsp"
  }, {
    name: "black pepper",
    quantity: 1 / 8,
    unit: "tsp"
  }],
  instructions: ["Dice bell pepper and onion into small pieces.", "Whisk eggs in a bowl and season with salt and pepper.", "Heat a non-stick skillet over medium heat and add a small amount of oil or butter.", "Add vegetables and cook for 2 minutes until slightly softened.", "Pour egg mixture over vegetables and cook until edges begin to set.", "Sprinkle cheese over half the omelet, then fold the other half over the cheese.", "Cook for another minute until cheese melts and serve hot."],
  swaps: [{
    original: "bell pepper",
    alternative: "tomatoes or spinach"
  }, {
    original: "cheese",
    alternative: "nutritional yeast (for dairy-free)"
  }]
}, {
  id: '3',
  name: "Quick Avocado Toast",
  image: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
  cookTime: 10,
  difficulty: "Easy",
  ingredients: [{
    name: "bread",
    quantity: 2,
    unit: "slices"
  }, {
    name: "avocado",
    quantity: 1,
    unit: ""
  }, {
    name: "lemon",
    quantity: 1 / 2,
    unit: ""
  }, {
    name: "salt",
    quantity: 1 / 4,
    unit: "tsp"
  }, {
    name: "red pepper flakes",
    quantity: 1 / 4,
    unit: "tsp"
  }],
  instructions: ["Toast the bread slices until golden brown.", "Cut the avocado in half, remove the pit, and scoop the flesh into a bowl.", "Mash the avocado with a fork and squeeze in lemon juice.", "Season with salt and red pepper flakes.", "Spread the avocado mixture onto the toast slices.", "Optional: top with additional ingredients like sliced tomatoes or eggs."],
  swaps: [{
    original: "lemon",
    alternative: "lime juice"
  }, {
    original: "red pepper flakes",
    alternative: "everything bagel seasoning"
  }]
}, {
  id: '4',
  name: "Simple Chicken Stir-Fry",
  image: "https://images.unsplash.com/photo-1603356033288-acfcb54801e6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
  cookTime: 25,
  difficulty: "Medium",
  ingredients: [{
    name: "chicken breast",
    quantity: 300,
    unit: "g"
  }, {
    name: "bell pepper",
    quantity: 1,
    unit: ""
  }, {
    name: "broccoli",
    quantity: 1,
    unit: "cup"
  }, {
    name: "soy sauce",
    quantity: 3,
    unit: "tbsp"
  }, {
    name: "garlic",
    quantity: 2,
    unit: "cloves"
  }, {
    name: "ginger",
    quantity: 1,
    unit: "tsp"
  }, {
    name: "rice",
    quantity: 1,
    unit: "cup"
  }],
  instructions: ["Cook rice according to package instructions.", "Cut chicken breast into bite-sized pieces.", "Chop bell pepper and cut broccoli into florets.", "Heat oil in a wok or large skillet over high heat.", "Add chicken and cook until no longer pink, about 5 minutes.", "Add vegetables, garlic, and ginger and stir-fry for 3-4 minutes.", "Pour in soy sauce and cook for another 2 minutes.", "Serve hot over cooked rice."],
  swaps: [{
    original: "chicken breast",
    alternative: "tofu or beef strips"
  }, {
    original: "soy sauce",
    alternative: "tamari or coconut aminos"
  }]
}, {
  id: '5',
  name: "Classic Tuna Salad",
  image: "https://images.unsplash.com/photo-1546069901-5ec6a79120b0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
  cookTime: 10,
  difficulty: "Easy",
  ingredients: [{
    name: "canned tuna",
    quantity: 1,
    unit: "can"
  }, {
    name: "mayonnaise",
    quantity: 2,
    unit: "tbsp"
  }, {
    name: "celery",
    quantity: 1,
    unit: "stalk"
  }, {
    name: "onion",
    quantity: 2,
    unit: "tbsp"
  }, {
    name: "lemon juice",
    quantity: 1,
    unit: "tsp"
  }, {
    name: "salt",
    quantity: 1 / 4,
    unit: "tsp"
  }, {
    name: "black pepper",
    quantity: 1 / 8,
    unit: "tsp"
  }],
  instructions: ["Drain the canned tuna and place in a bowl.", "Finely chop the celery and onion.", "Add celery, onion, mayonnaise, and lemon juice to the tuna.", "Season with salt and pepper.", "Mix well until combined.", "Serve on bread as a sandwich, with crackers, or over a bed of lettuce."],
  swaps: [{
    original: "mayonnaise",
    alternative: "Greek yogurt"
  }, {
    original: "celery",
    alternative: "cucumber"
  }]
}];