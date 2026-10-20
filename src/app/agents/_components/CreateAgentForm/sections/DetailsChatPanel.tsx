import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/agents/_components/Tabs/Tabs";

interface DetailsChatProps {
  detail: any;
  tab: "details" | "chat";
  onTabChange: (v: "details" | "chat") => void;
}
export default function DetailsChatPanel({
  detail,
  tab,
  onTabChange,
}: DetailsChatProps) {
  return (
    <Tabs
      value={tab}
      onValueChange={(v) => onTabChange(v as "details" | "chat")}
      className="flex h-full flex-col"
    >
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="chat">Chat</TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="flex-1 overflow-auto">
        <div className="space-y-2">
          <p>
            <strong>ID:</strong> {detail.agent_id}
          </p>
          <p>
            <strong>Status:</strong> {detail.status}
          </p>
        </div>
      </TabsContent>
      <TabsContent value="chat" className="flex-1 overflow-auto">
        <h2 className="font-semibold">Chat interface placeholder</h2>
      </TabsContent>
    </Tabs>
  );
}
