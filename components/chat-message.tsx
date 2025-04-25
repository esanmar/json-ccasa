import Markdown from "react-markdown";
import { Message } from "ai/react";
import remarkGfm from "remark-gfm";


const UserMessage = ({ text }: { text: string | undefined }) => {
  return (
    <div className="text-white bg-black self-end py-2 px-4 rounded-3xl">
      {text}
    </div>
  );
};

const AssistantMessage = ({ text }: { text: string | undefined }) => {
  return (
    <div className="bg-[#efefef] py-2 px-4 rounded-3xl w-fit max-w-full overflow-auto">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <table className="table-auto w-full border border-gray-300 text-sm">{children}</table>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100 border-b border-gray-300">{children}</thead>
          ),
          tr: ({ children }) => <tr className="border-b">{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-r text-gray-800">{children}</td>
          ),
        }}
      >
        {text ?? ""}
      </Markdown>
    </div>
  );
};


export default function ChatMessage({ role, content }: Partial<Message>) {
  switch (role) {
    case "user":
      return <UserMessage text={content} />;
    case "assistant":
      return <AssistantMessage text={content} />;
    default:
      return null;
  }
}
