import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ask } from "./chat";
import { useRegion } from "./region";

/**
 * The AI assistant panel is open whenever the URL has `?ask`, so it works on any page and the back
 * button closes it. A link with a question (`?ask=something funny`) asks it on arrival.
 */
export const ASK_PARAM = "ask";

/** Marks the history entry the panel pushed when it opened, so closing it can go back instead. */
interface PanelState {
  askPushed?: boolean;
}

export function useAskPanel() {
  const [params, setParams] = useSearchParams();
  const { state } = useLocation() as { state: PanelState | null };
  const navigate = useNavigate();
  const region = useRegion();
  const open = params.has(ASK_PARAM);

  const setParam = (value: string | null, options: { replace: boolean; state?: PanelState | null }) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === null) next.delete(ASK_PARAM);
        else next.set(ASK_PARAM, value);
        return next;
      },
      { preventScrollReset: true, ...options },
    );

  return {
    open,
    /** A question that arrived in the URL and hasn't been asked yet. */
    linkedQuestion: params.get(ASK_PARAM)?.trim() ?? "",
    /** Open the panel, asking `question` straight away if given. */
    openPanel: (question = "") => {
      if (question.trim()) ask(question, region);
      if (!open) setParam("", { replace: false, state: { askPushed: true } });
    },
    /** Close the panel: back to the entry before it opened, or (shared link, reload) drop `?ask`. */
    close: () => {
      if (!open) return;
      if (state?.askPushed) navigate(-1);
      else setParam(null, { replace: true });
    },
    /** Drop an asked question from the URL, so going back or reloading doesn't ask it again. */
    clearLinkedQuestion: () => setParam("", { replace: true, state }),
  };
}
