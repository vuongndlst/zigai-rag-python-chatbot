import PromptSuggestionButton from "./PromptSuggestionButton";

const PromptSuggestionRow = ({ onPromptClick }) => {
    const prompts = [
       "Làm thế nào để khai báo biến trong Python?",
        "Sự khác biệt giữa list và tuple là gì?",
        "Câu lệnh if trong Python hoạt động như thế nào?"
    ];

    return(
        <div className="prompt-suggestion-row">
            {prompts.map((prompt, index) => (
                <PromptSuggestionButton
                    key={`suggestion-${index}`}
                    text={prompt}
                    onClick={() => onPromptClick(prompt)}/>
            ))}
        </div>
    )
}

export default PromptSuggestionRow;