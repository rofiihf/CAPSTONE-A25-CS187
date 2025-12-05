import MessagePresenter from "../pages/message/messagePresenter.js";
import MessageModel from "../pages/message/messageModel.js";

let presenterInstance = null;

export function getMessagePresenter() {
  if (!presenterInstance) {
    const model = new MessageModel();
    presenterInstance = new MessagePresenter({ model });
  }
  return presenterInstance;
}