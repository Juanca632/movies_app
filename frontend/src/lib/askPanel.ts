import { useSearchParams } from "react-router-dom";
import { ask } from "./chat";
import { useRegion } from "./region";

/**
 * The AI assistant panel is open whenever the URL has `?ask`, so it works on any page and the back
 * button closes it. A link with a question (`?ask=something funny`) asks it on arrival.
 */
export const ASK_PARAM = "ask";

export function useAskPanel() {
  const [params, setParams] = useSearchParams();
  const region = useRegion();
  const open = params.has(ASK_PARAM);

  const setParam = (value: string | null, replace = false) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === null) next.delete(ASK_PARAM);
        else next.set(ASK_PARAM, value);
        return next;
      },
      { preventScrollReset: true, replace },
    );

  return {
    open,
    /** A question that arrived in the URL and hasn't been asked yet. */
    linkedQuestion: params.get(ASK_PARAM)?.trim() ?? "",
    /** Open the panel, asking `question` straight away if given. */
    openPanel: (question = "") => {
      if (question.trim()) ask(question.trim(), region);
      setParam("", open);
    },
    close: () => setParam(null),
    /** Drop an asked question from the URL, so going back or reloading doesn't ask it again. */
    clearLinkedQuestion: () => setParam("", true),
  };
}
