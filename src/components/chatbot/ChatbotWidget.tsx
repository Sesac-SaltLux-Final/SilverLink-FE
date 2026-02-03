import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, User, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import chatbotApi, { ChatRequest } from "@/api/chatbot";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import guardiansApi from "@/api/guardians";

interface Message {
    id: number;
    content: string;
    sender: "user" | "bot";
    timestamp: Date;
}

export default function ChatbotWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 0,
            content: "안녕하세요! 어르신 돌봄에 대해 궁금한 점을 물어보세요.",
            sender: "bot",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [elderlyId, setElderlyId] = useState<number | null>(null);
    const [threadId, setThreadId] = useState<string>("");

    // 스레드 ID 초기화
    useEffect(() => {
        if (user) {
            const key = `chatbot_thread_${user.id}`;
            let stored = localStorage.getItem(key);
            if (!stored) {
                stored = `g_${user.id}_${Date.now()}`;
                localStorage.setItem(key, stored);
            }
            setThreadId(stored);
        }
    }, [user]);

    // 어르신 ID 가져오기 (최초 1회)
    useEffect(() => {
        if (isOpen && !elderlyId && user?.role === 'GUARDIAN') {
            const fetchElderly = async () => {
                try {
                    const elderly = await guardiansApi.getMyElderly();
                    if (elderly && elderly.elderlyId) {
                        setElderlyId(elderly.elderlyId);
                    } else {
                        setMessages(prev => [
                            ...prev,
                            {
                                id: Date.now(),
                                content: "등록된 어르신이 없습니다. 보호자 페이지에서 어르신을 먼저 등록해주세요.",
                                sender: "bot",
                                timestamp: new Date(),
                            }
                        ]);
                    }
                } catch (error) {
                    console.error("Failed to fetch elderly info", error);
                }
            };
            fetchElderly();
        }
    }, [isOpen, user, elderlyId]);

    // 스크롤 자동 이동
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !user || !elderlyId) return;

        const userMessage: Message = {
            id: Date.now(),
            content: input,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const request: ChatRequest = {
                message: userMessage.content,
                guardian_id: user.id,
                elderly_id: elderlyId,
                thread_id: threadId,
            };

            const response = await chatbotApi.sendMessage(request);

            const botMessage: Message = {
                id: Date.now() + 1,
                content: response.answer,
                sender: "bot",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error(error);
            toast.error("챗봇 응답에 실패했습니다.");
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    content: "죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                    sender: "bot",
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            handleSend();
        }
    };

    if (user?.role !== 'GUARDIAN') return null;

    return (
        <div
            className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4"
            style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 50 }}
        >
            {isOpen && (
                <Card className="w-[350px] h-[500px] shadow-2xl border-primary/20 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <CardHeader className="bg-primary/5 p-4 flex flex-row items-center justify-between border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Bot className="w-5 h-5 text-primary" />
                            AI 돌봄 비서
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0 h-[380px]">
                        <ScrollArea className="h-full p-4">
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === "user"
                                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                                : "bg-muted rounded-tl-none"
                                                }`}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-muted p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-xs text-muted-foreground">답변 작성 중...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="p-3 border-t bg-background">
                        <div className="flex w-full gap-2">
                            <Input
                                placeholder={!elderlyId ? "어르신 정보 로딩 중..." : "메시지를 입력하세요..."}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading || !elderlyId}
                                className="flex-1 focus-visible:ring-1"
                            />
                            <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim() || !elderlyId}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            )}

            <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform duration-200 bg-primary text-primary-foreground"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </Button>
        </div>
    );
}
