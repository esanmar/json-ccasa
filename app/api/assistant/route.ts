import { AssistantResponse } from "ai";
import OpenAI from "openai";
import { getWeather } from "@/lib/utils";

const openai = new OpenAI();

export async function POST(req: Request) {
  const input: {
    threadId: string;
    message: string;
  } = await req.json();

  const threadId = input.threadId ?? (await openai.beta.threads.create({})).id;
  const createdMessage = await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: input.message,
  });

  return AssistantResponse(
    { threadId, messageId: createdMessage.id },
    async ({ forwardStream, sendDataMessage, sendMessage }) => {
      const runStream = openai.beta.threads.runs.stream(threadId, {
        assistant_id:
          process.env.OPENAI_ASSISTANT_ID ??
          (() => {
            throw new Error("OPENAI_ASSISTANT_ID variable is not set");
          })(),
      });

      let codeInterpreterInput = "";
      let codeInterpreterId = "";
      let codeInterpreterInvoked = false;

      runStream
        .on("toolCallDelta", async delta => {
          if (delta.type !== "code_interpreter") return;

          if (delta.code_interpreter?.input) {
            for await (let textDelta of delta.code_interpreter.input) {
              codeInterpreterInput += textDelta;
            }
            codeInterpreterId = delta.id || "";
          }

          if (delta.code_interpreter?.outputs) {
            sendDataMessage({
              role: "data",
              data: {
                // @ts-ignore
                temperature: delta.code_interpreter.outputs[0].logs,
                unit: "F",
              },
            });
          }

          codeInterpreterInvoked = true;
        })
        .on("messageCreated", () => {
          if (!codeInterpreterInvoked) return;

          sendMessage({
            id: codeInterpreterId,
            role: "assistant",
            content: [{ type: "text", text: { value: codeInterpreterInput } }],
          });
        });

      let runResult = await forwardStream(runStream);

      while (
        runResult?.status === "requires_action" &&
        runResult.required_action?.type === "submit_tool_outputs"
      ) {
        const tool_outputs =
          runResult.required_action.submit_tool_outputs.tool_calls.map(
            (toolCall: any) => {
              const parameters = JSON.parse(toolCall.function.arguments);

              switch (toolCall.function.name) {
  case "get_weather":
    const weatherData = getWeather(parameters.location);

    sendDataMessage({
      id: toolCall.id,
      role: "data",
      data: weatherData,
    });

    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify(weatherData),
    };

  case "mostrar_tramites":
    // ⚠️ Aquí deberías generar los datos reales basados en el JSON
    // Por ahora, devolvemos uno simulado como ejemplo
    const tramites = [
      {
        codProcedimiento: 5192,
        titulo: "Álava Innova - Digitaliza Hijo",
        finalidad: "Promover la innovación...",
        friendlyUrl: "/alava-innova",
        ente: "Diputación Foral de Álava",
        nivel1Tema: "Desarrollo económico",
        claseTramite: "Ayudas y subvenciones",
        descripcionPlazo: "Abierto el plazo",
      }
    ];

    return {
  tool_call_id: toolCall.id,
  output: JSON.stringify(parameters), // los mismos que el modelo ha generado
};
  default:
    throw new Error(
      `Unknown tool call function: ${toolCall.function.name}`
    );
}

        runResult = await forwardStream(
          openai.beta.threads.runs.submitToolOutputsStream(
            threadId,
            runResult.id,
            { tool_outputs }
          )
        );
      }
    }
  );
}
