let recetas = {};
let heladera = [
  "Manzanas",
  "Masa quebrada",
  "Huevo",
  "200g de pasta",
  "400g de tomate triturado",
  "Un diente de ajo",
  "Aceite de oliva",
  "Dos unidades manzanas", 
  "Una unidad masa quebrada", 
  "Una unidad huevo",
  "Sal y pimienta",
  "Masa para empanadas",
  "500g de carne picada",
  "1 cebolla",
  "2 huevos duros",
  "Aceitunas verdes",
  "Comino, sal y pimienta"
];

let ultimaRecetaBuscada = null;

const recognition = new (window.SpeechRecognition ||
  window.webkitSpeechRecognition)();
recognition.lang = "es-ES";
recognition.interimResults = false;
recognition.maxAlternatives = 1;

let isListening = false;
let currentState = "initial";

document
  .getElementById("startButton")
  .addEventListener("click", startConversation);

  function startConversation() {
    const initialMessage = 
      "Puedes pedirme una 'Receta específica', 'Recetas disponibles', 'Mostrar heladera', o 'Salir'.";
    speakAndListen(initialMessage);
    showMessage(initialMessage, "assistant-message");
    currentState = "initial";
  }

function startRecognition() {
  if (!window.speechSynthesis.speaking && !isListening) {
    try {
      isListening = true;
      recognition.start();
    } catch (error) {
      console.error("Error al iniciar reconocimiento:", error);
      isListening = false;
    }
  }
}

recognition.onstart = () => {
  if (!window.speechSynthesis.speaking) {
    showMessage("Estoy escuchando...", "assistant-message");
  } else {
    recognition.stop();
  }
};

recognition.onresult = (event) => {
  const resultado = event.results[0][0].transcript.toLowerCase().trim();
  console.log(
    "Resultado del reconocimiento de voz:",
    resultado,
    "Estado actual:",
    currentState
  );

  showMessage(resultado, "user-message");

  const stateHandlers = {
    initial: handleInitialState,
    waiting_recipe: handleRecipeState,
    confirming_recipe_without_ingredients: handleRecipeConfirmationState,
    selecting_available_recipe: handleAvailableRecipeState,
    confirming_recipe_repetition: handleRecipeRepetitionState,
    confirming_recipe_continuation: handleRecipeContinuationState,
  };

  const handler = stateHandlers[currentState];
  if (handler) {
    handler(resultado);
  }
};

function handleInitialState(resultado) {
  resultado = resultado.toLowerCase().trim();
  const recipeCommands = [
    "receta específica",
    "receta especifica",
    "buscar receta",
    "recetas específicas",
    "quiero una receta",
  ];
  const availableRecipesCommands = [
    "recetas disponibles",
    "que puedo cocinar",
    "listar recetas", 
     "dame la lista de recetas",
    "que hay para cocinar",
    "ver recetas",
    "mostrar recetas",
  ];
  const fridgeCommands = [
    "mostrar heladera",
    "heladera",
    "ver heladera",
    "que hay en la heladera",
  ];
  const exitCommands = [
    "salir",
    "terminar",
    "finalizar",
    "adiós",
    "adios",
    "chau",
    "hasta luego"
  ];

  if (exitCommands.some(cmd => resultado.includes(cmd))) {
    window.speechSynthesis.cancel();
        try {
      recognition.stop();
    } catch (error) {
      console.error("Error al detener el reconocimiento:", error);
    }

    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onend = null;
    recognition.onerror = null;

    currentState = "exit";
    isListening = false;

    const utterance = new SpeechSynthesisUtterance("¡Gracias por usar el asistente de cocina! ¡Hasta pronto!");
    utterance.lang = "es-ES";
    utterance.onend = () => {
      recognition.stop();
    };
    window.speechSynthesis.speak(utterance);
    showMessage("¡Gracias por usar el asistente de cocina! ¡Hasta pronto!", "assistant-message");

    return;
  }

  if (availableRecipesCommands.some((cmd) => resultado.includes(cmd))) {
    speakAndListen(
      "Un momento, revisaré qué puedes cocinar con los ingredientes disponibles..."
    );
    showMessage(
      "Un momento, revisaré qué puedes cocinar con los ingredientes disponibles...",
      "assistant-message"
    );
    mostrarRecetasDisponibles();
  } else if (recipeCommands.some((cmd) => resultado.includes(cmd))) {
    speakAndListen("¿Qué receta quieres buscar?");
    showMessage("¿Qué receta quieres buscar?", "assistant-message");
    currentState = "waiting_recipe";
  } else if (fridgeCommands.some((cmd) => resultado.includes(cmd))) {
    mostrarHeladera();
  } else {
    speakAndListen("No entendí tu solicitud. Por favor, intenta de nuevo.");
    showMessage(
      "No entendí tu solicitud. Por favor, intenta de nuevo.",
      "assistant-message"
    );
  }
}

function handleRecipeState(resultado) {
  buscarReceta(resultado);
}

function mostrarReceta(receta) {
  const verificacion = verificarIngredientes(receta.ingredientes);
  if (verificacion.todoPresente) {
    renderRecipeDisplay(receta);
    leerRecetaCompleta(receta);
  } else {
    const ingredientesFaltantes = verificacion.faltantes.join(", ");
    speakAndListen(
      `Te faltan los siguientes ingredientes: ${ingredientesFaltantes}. ¿Quieres ver la receta de todos modos?`
    );
    showMessage(
      `Te faltan los siguientes ingredientes: ${ingredientesFaltantes}. ¿Quieres ver la receta de todos modos? (Sí/No)`,
      "assistant-message"
    );
    currentState = "confirming_recipe_without_ingredients";
    ultimaRecetaBuscada = receta;
  }
}

function speakAndListen(text) {
  return new Promise((resolve) => {
    if (isListening) {
      recognition.stop();
      isListening = false;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";

    utterance.onstart = () => {
      if (isListening) {
        recognition.stop();
        isListening = false;
      }
    };

    utterance.onend = () => {
      setTimeout(() => {
        if (!window.speechSynthesis.speaking) {
          startRecognition();
        }
        resolve();
      }, 200);
    };
    window.speechSynthesis.speak(utterance);
  });
}

function renderRecipeDisplay(receta) {
  let recetaHTML = `<h3>Receta de ${receta.nombre}</h3>
    <p>Contiene ${receta.valorNutricional}</p>
    <h4>Ingredientes:</h4>
    <ul>
        ${receta.ingredientes
          .map((ingrediente) => `<p>${ingrediente}</p>`)
          .join("")}
    </ul>
    <h4>Instrucciones:</h4>
    <ol>
        ${receta.instrucciones
          .map((instruccion) => `<p>${instruccion}</p>`)
          .join("")}
    </ol>`;

  showMessage(recetaHTML, "assistant-message", true);
}

async function leerRecetaCompleta(receta) {
  try {
    const speak = (text) =>
      new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "es-ES";
        utterance.onend = resolve;
        window.speechSynthesis.speak(utterance);
      });
    window.speechSynthesis.cancel();
    await speak(`Receta de ${receta.nombre}`);
    await speak("Ingredientes:");
    for (let ingrediente of receta.ingredientes) {
      await speak(ingrediente);
    }
    await speak("Instrucciones:");
    for (let i = 0; i < receta.instrucciones.length; i++) {
      await speak(`Paso ${i + 1}: ${receta.instrucciones[i]}`);
    }

    await speak("¿Quieres que te repita la receta?");

    showMessage(
      "¿Quieres que te repita la receta? (Sí/No)",
      "assistant-message"
    );
    startRecognition();
    currentState = "confirming_recipe_repetition";
    ultimaRecetaBuscada = receta;
  } catch (error) {
    console.error("Error al leer la receta:", error);
    speakAndListen("Hubo un problema al leer la receta.");
    showMessage("Hubo un problema al leer la receta.", "assistant-message");
  }
}

//receta disponible
function mostrarRecetasDisponibles() {
  try {
    const recetasDisponibles = Object.values(recetas).filter((receta) => {
      return verificarIngredientes(receta.ingredientes).todoPresente;
    });

if (recetasDisponibles.length > 0) {
  let mensajeHTML = `
    <h3>Con tus ingredientes actuales puedes preparar:</h3>
      <p>
          ${recetasDisponibles
            .map((receta) => `<p> ${receta.nombre}</p>`)
            .join("")}
      </p>
    <p>¿Cuál de estas recetas te gustaría preparar?</p>
`;

      showMessage(mensajeHTML, "assistant-message", true);
      const speak = (text) =>
        new Promise((resolve) => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = "es-ES";
          utterance.onend = resolve;
          window.speechSynthesis.speak(utterance);
        });

      speak("Con tus ingredientes actuales puedes preparar:");
      recetasDisponibles.forEach(async (receta) => {
        await speak(receta.nombre);
      });
      currentState = "selecting_available_recipe";
      speakAndListen("¿Cuál de estas recetas te gustaría preparar?");
    } else {
      speakAndListen(
        "Lo siento, no hay recetas disponibles con los ingredientes actuales de tu heladera."
      );
      showMessage(
        "Lo siento, no hay recetas disponibles con los ingredientes actuales de tu heladera.",
        "assistant-message"
      );
      currentState = "initial";
      askIfNeedMore();
    }
  } catch (error) {
    console.error("Error al mostrar recetas disponibles:", error);
    speakAndListen("Hubo un error al buscar las recetas disponibles.");
    showMessage(
      "Hubo un error al buscar las recetas disponibles.",
      "assistant-message"
    );
    currentState = "initial";
    askIfNeedMore();
  }
}

function handleAvailableRecipeState(resultado) {
  const recetaSeleccionada = Object.values(recetas).find((receta) => 
    receta.nombre.toLowerCase().includes(resultado.toLowerCase())
  );

  if (recetaSeleccionada) {
    mostrarReceta(recetaSeleccionada);
  } else {
    speakAndListen("No encontré esa receta. Por favor, nombra una de las recetas disponibles que mencioné.");
    showMessage("No encontré esa receta. Por favor, nombra una de las recetas disponibles que mencioné.", "assistant-message");
  }
}

// BUSCAR RECETA ESPECIFICA
async function buscarReceta(nombreReceta) {
  const receta = Object.values(recetas).find((r) => {
    const nombreNormalizado = r.nombre.toLowerCase();
    const busquedaNormalizada = nombreReceta.toLowerCase();

    return (
      nombreNormalizado === busquedaNormalizada ||
      busquedaNormalizada.includes(nombreNormalizado) ||
      nombreNormalizado.includes(busquedaNormalizada) ||
      calcularDistanciaLevenshtein(nombreNormalizado, busquedaNormalizada) <= 2
    );
  });

  if (receta) {
    mostrarReceta(receta);
  } else {
    const notFoundMessage = `No encontré la receta de ${nombreReceta}.`;
    showMessage(notFoundMessage, "assistant-message");
    await speakAndListen(notFoundMessage);
    currentState = "initial";
    await askIfNeedMore();
  }
}

function calcularDistanciaLevenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function leerMensajeConRetraso(mensaje) {
  return new Promise((resolve) => {
    setTimeout(() => {
      speakAndListen(mensaje).then(resolve);
    }, 300);
  });
}

//LISTA TODOS LOS ELEMENTOS DE LA HELADERA
async function mostrarHeladera() {
  try {
    let mensaje = `
            <h3>Ingredientes en tu heladera:</h3>
            <p>
                ${heladera
                  .map((ingrediente) => `<p>${ingrediente}</p>`)
                  .join("")}
            </p>
        `;
    showMessage(mensaje, "assistant-message", true);
    const speak = (text) =>
      new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "es-ES";
        utterance.onend = resolve;
        window.speechSynthesis.speak(utterance);
      });

    window.speechSynthesis.cancel();
    await speak("Ingredientes en tu heladera:");
    for (let ingrediente of heladera) {
      await speak(ingrediente);
    }

    currentState = "initial";
    askIfNeedMore();
  } catch (error) {
    console.error("Error al leer los ingredientes de la heladera:", error);
    await speakAndListen("Hubo un problema al leer los ingredientes.");
    currentState = "initial";
    askIfNeedMore();
  }
}

function askIfNeedMore() {
  speakAndListen(
    "¿Necesitas algo más? Puedes decir 'receta específica', 'recetas disponibles', 'mostrar heladera', 'conocer recetas', o 'salir'."
  );
  showMessage(
    "¿Necesitas algo más? Puedes decir 'receta específica', 'recetas disponibles', 'mostrar heladera', 'conocer recetas', o 'salir'.",
    "assistant-message"
  );
}

function showMessage(message, sender, isHTML = false) {
  try {
    const conversation = document.getElementById("conversation");
    if (!conversation) {
      console.error("Conversation element not found");
      return;
    }
    const messageElement = document.createElement("div");
    messageElement.classList.add(sender);

    if (isHTML) {
      messageElement.innerHTML = message;
    } else {
      messageElement.textContent = message;
    }
    conversation.appendChild(messageElement);
    conversation.scrollTop = conversation.scrollHeight;
  } catch (error) {
    console.error("Error displaying message:", error);
  }
}

function speakAndListen(text) {
  window.speechSynthesis.cancel();
  if (isListening) {
    recognition.stop();
    isListening = false;
  }

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";

    utterance.onend = () => {
      setTimeout(() => {
        if (!isListening) {
          startRecognition();
        }
        resolve();
      }, 500);
    };

    window.speechSynthesis.speak(utterance);
  });
}

recognition.onerror = (event) => {
  console.error("Error en el reconocimiento de voz:", event.error);
  isListening = false;

  if (!window.speechSynthesis.speaking) {
    speakAndListen("Hubo un error al reconocer la voz. Intenta de nuevo.");
    showMessage(
      "Hubo un error al reconocer la voz. Intenta de nuevo.",
      "assistant-message"
    );
    currentState = "initial";
    askIfNeedMore();
  }
};

recognition.onend = () => {
  if (currentState === "exit") {
    isListening = false;
    return;
  }

  isListening = false;
  if (currentState !== "initial" && !window.speechSynthesis.speaking) {
    startRecognition();
  }
};
function handleRecipeConfirmationState(resultado) {
  const yesResponses = [
    "sí",
    "si",
    "okay",
    "okey",
    "vale",
    "si quiero",
    "sí quiero",
    "quiero",
    " si por favor",
    "adelante",
    "claro",
    "por supuesto",
    "dale",
    "bueno",
    "está bien",
    "ok",
    "me gustaría",
    "me gustaria",
    "bien",
    "por favor",
  ];
  const noResponses = [
    "no",
    "no gracias",
    "paso",
    "siguiente",
    "no",
    "para nada",
    "en otro momento",
    "ahora no",
    "mejor no",
    "no quiero",
    "no no",
    "next",
    "negativo",
  ];

  resultado = resultado.toLowerCase().trim();

  if (yesResponses.includes(resultado)) {
    if (ultimaRecetaBuscada) {
      renderRecipeDisplay(ultimaRecetaBuscada);
      leerRecetaCompleta(ultimaRecetaBuscada);
    } else {
      speakAndListen("Lo siento, hubo un problema para mostrar la receta.");
      showMessage(
        "Lo siento, hubo un problema para mostrar la receta.",
        "assistant-message"
      );
      currentState = "initial";
      askIfNeedMore();
    }
  } else if (noResponses.includes(resultado)) {
    speakAndListen("Entendido. Volvamos al menú principal.");
    showMessage("Entendido. Volvamos al menú principal.", "assistant-message");
    currentState = "initial";
    askIfNeedMore();
  } else {
    speakAndListen("Por favor, responde 'Sí' o 'No'.");
    showMessage("Por favor, responde 'Sí' o 'No'.", "assistant-message");
  }
}

function handleAvailableRecipeState(resultado) {
  const recetaSeleccionada = Object.values(recetas).find((receta) => 
    receta.nombre.toLowerCase().includes(resultado.toLowerCase())
  );

  if (recetaSeleccionada) {
    mostrarReceta(recetaSeleccionada);
    currentState = "initial";
  } else {
    speakAndListen("No encontré esa receta. Por favor, nombra una de las recetas disponibles que mencioné.");
    showMessage("No encontré esa receta. Por favor, nombra una de las recetas disponibles que mencioné.", "assistant-message");
  }
}

// RECETA ESPECIFICA
function handleRecipeRepetitionState(resultado) {
  const yesResponses = [
    "sí",
    "si",
    "okay",
    "okey",
    "vale",
    "si quiero",
    "sí quiero",
    "quiero",
    " si por favor",
    "adelante",
    "claro",
    "por supuesto",
    "dale",
    "bueno",
    "está bien",
    "ok",
    "me gustaría",
    "me gustaria",
    "bien",
    "por favor",
  ];
  const noResponses = [
    "no",
    "no gracias",
    "paso",
    "siguiente",
    "no",
    "para nada",
    "en otro momento",
    "ahora no",
    "mejor no",
    "no quiero",
    "no no",
    "next",
    "negativo",
  ];

  resultado = resultado.toLowerCase().trim();

  if (yesResponses.includes(resultado)) {
    if (ultimaRecetaBuscada) {
      renderRecipeDisplay(ultimaRecetaBuscada);
      leerRecetaCompleta(ultimaRecetaBuscada);
    } else {
      speakAndListen("Lo siento, hubo un problema para mostrar la receta.");
      showMessage(
        "Lo siento, hubo un problema para mostrar la receta.",
        "assistant-message"
      );
      currentState = "initial";
      askIfNeedMore();
    }
  } else if (noResponses.includes(resultado)) {
    speakAndListen("Entendido. Volvamos al menú principal.");
    showMessage("Entendido. Volvamos al menú principal.", "assistant-message");
    currentState = "initial";
    askIfNeedMore();
  } else {
    speakAndListen("Por favor, responde 'Sí' o 'No'.");
    showMessage("Por favor, responde 'Sí' o 'No'.", "assistant-message");
  }
}

function handleRecipeContinuationState(resultado) {
  resultado = resultado.toLowerCase().trim();

  const menuResponses = ["menú", "menu", "principal"];
  const recetaResponses = ["receta", "continuar"];

  if (menuResponses.includes(resultado)) {
    speakAndListen("Entendido. Volvamos al menú principal.");
    showMessage("Entendido. Volvamos al menú principal.", "assistant-message");
    currentState = "initial";
    askIfNeedMore();
  } else if (recetaResponses.includes(resultado)) {
    handleRecipeRepetitionState("sí");
  } else {
    speakAndListen("Por favor, responde 'Menú' o 'Receta'.");
    showMessage("Por favor, responde 'Menú' o 'Receta'.", "assistant-message");
  }
}

fetch("recetas.json")
  .then((response) => response.json())
  .then((data) => {
    recetas = data;
  })
  .catch((error) => {
    console.error("Error al cargar las recetas:", error);
  });

function verificarIngredientes(ingredientesNecesarios) {
  const ingredientesFaltantes = ingredientesNecesarios.filter(
    (ingredienteNecesario) => {
      const palabrasClave = ingredienteNecesario
        .toLowerCase()
        .replace(/^\d+\s*(\w+)?\s*/, "")
        .split(/\s+/)
        .filter((palabra) => palabra.length > 2);

      const ingredienteEnHeladera = palabrasClave.every((palabra) =>
        heladera.some((ingredienteGuardado) =>
          ingredienteGuardado.toLowerCase().includes(palabra)
        )
      );

      return !ingredienteEnHeladera;
    }
  );
  return {
    todoPresente: ingredientesFaltantes.length === 0,
    faltantes: ingredientesFaltantes,
  };
}

// renderiza en el html las recetas y valor nutricoinal 
function mostrarDetallesReceta(receta) {
  
  const detallesReceta = `
      <h3>${receta.nombre}</h3>
      <p><strong>Ingredientes:</strong></p>
      <ul>${receta.ingredientes.map(ing => `<li>${ing}</li>`).join('')}</ul>
      <p><strong>Preparación:</strong></p>
      <ol>${receta.pasos.map(paso => `<li>${paso}</li>`).join('')}</ol>
      <p>< ${receta.valorNutricional || 'No disponible'}</p>
  `;
    document.querySelector('#detalles-receta').innerHTML = detallesReceta;
}
