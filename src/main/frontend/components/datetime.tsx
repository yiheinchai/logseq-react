import React, { useState } from "react";
import { DateTime } from "luxon";
import { useRecoilState } from "recoil";
import * as t from "cljs-time.core";
import * as string from "clojure.string";
import * as commands from "frontend.commands";
import * as svg from "frontend.components.svg";
import * as date from "frontend.date";
import * as editorHandler from "frontend.handler.editor";
import * as repeated from "frontend.handler.repeated";
import * as state from "frontend.state";
import * as ui from "frontend.ui";
import * as util from "frontend.util";
import * as pageRef from "logseq.graph-parser.util.page-ref";

interface Timestamp {
  time: string;
  repeater: {
    num?: number;
    duration?: string;
    kind?: string;
  };
  date?: DateTime;
}

const defaultTimestampValue: Timestamp = {
  time: "",
  repeater: {},
};

interface TimeInputProps {
  defaultValue: string;
}

const TIME_INPUT_CLASS = "form-input w-20 ms:w-60";
const TIME_FORMAT = "HH:mm";

const useShowInput = (initialValue: boolean) => {
  const [show, setShow] = useState(initialValue);

  const handleShow = useCallback(() => {
    setShow(true);
  }, []);

  const handleHide = useCallback(() => {
    setShow(false);
  }, []);

  return [show, handleShow, handleHide] as const;
};

const useDefaultTime = () => {
  const [timestamp, setTimestamp] = useRecoilState(state.timestamp);

  const handleSetTime = useCallback((value: string) => {
    setTimestamp((prev) => ({ ...prev, time: value }));
  }, []);

  const handleClearTime = useCallback(() => {
    setTimestamp((prev) => ({ ...prev, time: null }));
  }, []);

  const handleSetDefaultTime = useCallback(() => {
    const { hour, minute } = date.getLocalDate();
    const result = DateTime.fromObject({ hour, minute }).toFormat(TIME_FORMAT);
    handleSetTime(result);
  }, []);

  return [
    timestamp.time,
    handleSetTime,
    handleClearTime,
    handleSetDefaultTime,
  ] as const;
};

const TimeInput: React.FC<TimeInputProps> = React.memo(({ defaultValue }) => {
  const [show, handleShow, handleHide] = useShowInput(false);
  const [time, handleSetTime, handleClearTime, handleSetDefaultTime] =
    useDefaultTime();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const value = event.target.value;
    handleSetTime(value);
  };

  const handleClick = () => {
    handleHide();
    handleClearTime();
  };

  return show || !util.isBlank(defaultValue) ? (
    <div className="flex flex-row" style={{ height: 32 }}>
      <input
        id="time"
        className={TIME_INPUT_CLASS}
        defaultValue={defaultValue}
        onChange={handleChange}
      />
      <a className="ml-2 self-center" onClick={handleClick}>
        {svg.close}
      </a>
    </div>
  ) : (
    <a
      className="text-sm"
      onClick={() => {
        handleShow();
        handleSetDefaultTime();
      }}
    >
      Add time
    </a>
  );
});

const RepeaterCp = ({
  num,
  duration,
  kind,
}: {
  num?: number;
  duration?: string;
  kind?: string;
}) => {
  const [show, setShow] = useState(false);
  const [timestamp, setTimestamp] = useRecoilState(state.timestamp);

  const handleNumChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTimestamp((prev) => ({
      ...prev,
      repeater: { ...prev.repeater, num: value },
    }));
  };

  const handleDurationChange = (value: string) => {
    setTimestamp((prev) => ({
      ...prev,
      repeater: { ...prev.repeater, duration: value },
    }));
  };

  const handleClick = () => {
    setShow(false);
    setTimestamp((prev) => ({ ...prev, repeater: {} }));
  };

  if (show || (num && duration && kind)) {
    return (
      <div className="w-full flex flex-row justify-left">
        <input
          id="repeater-num"
          className="form-input mt-1 w-8 px-1 sm:w-20 sm:px-2 text-center"
          defaultValue={num}
          onChange={handleNumChange}
        />
        {ui.select(
          [
            { label: "h" },
            { label: "d" },
            { label: "w" },
            { label: "m" },
            { label: "y" },
          ].map((item) =>
            item.label === duration ? { ...item, selected: "selected" } : item
          ),
          handleDurationChange,
          null
        )}
        <a className="ml-1 self-center" onClick={handleClick}>
          {svg.close}
        </a>
      </div>
    );
  } else {
    return (
      <a
        className="text-sm"
        onClick={() => {
          setShow(true);
          setTimestamp((prev) => ({
            ...prev,
            repeater: { kind: ".+", num: 1, duration: "d" },
          }));
        }}
      >
        Add repeater
      </a>
    );
  }
};

const clearTimestamp = () => {
  state.setTimestamp(defaultTimestampValue);
  state.setShowTime(false);
  state.setShowRepeater(false);
  state.setState("date-picker/date", null);
};

const onSubmit = (e?: React.SyntheticEvent) => {
  if (e) e.preventDefault();
  const { repeater, ...timestamp } = state.getTimestamp();
  const date = state.getState("date-picker/date") || t.today();
  const timestamp = { ...timestamp, date: date };
  const kind = repeater.duration === "w" ? "++" : ".+";
  const timestamp = { ...timestamp, repeater: { ...repeater, kind } };
  const text = repeated.timestampMapToText(timestamp);
  const blockData = state.getTimestampBlock();
  const { block, typ, show } = blockData;
  const editingBlockId = state.getEditBlock().block.uuid;
  const blockId = block?.block.uuid || editingBlockId;
  const typ = commands.currentCommand || typ;
  if (state.editing() && editingBlockId === blockId) {
    editorHandler.setEditingBlockTimestamp(typ, text);
  } else {
    editorHandler.setBlockTimestamp(blockId, typ, text);
  }
  if (show) {
    show.set(false);
  }
  clearTimestamp();
  state.setTimestampBlock(null);
  commands.restoreState();
};

const TimeRepeater = () => {
  const { time, repeater } = useRecoilValue(state.timestamp);

  return (
    <div id="time-repeater" className="py-1 px-4">
      <p className="text-sm opacity-50 font-medium mt-4">Time:</p>
      <TimeInput defaultValue={time} />

      <p className="text-sm opacity-50 font-medium mt-4">Repeater:</p>
      <RepeaterCp {...repeater} />

      <p className="mt-4">
        {ui.button("Submit", {
          onClick: onSubmit,
        })}
      </p>
    </div>
  );
};

interface DatePickerProps {
  domId: string;
  format: string;
  ts?: Timestamp;
}

const DatePicker: React.FC<DatePickerProps> = ({ domId, format, ts }) => {
  const currentCommand = useRecoilValue(commands.currentCommand);
  const deadlineOrSchedule =
    currentCommand &&
    ["deadline", "scheduled"].includes(currentCommand.toLowerCase());
  const [date, setDate] = useRecoilState(state.datePickerDate);

  React.useEffect(() => {
    clearTimestamp();
    if (ts) {
      state.setTimestamp(ts);
    } else {
      state.setTimestamp({ time: "", repeater: {} });
    }
    if (!date) {
      setDate(ts?.date || t.today());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      id="date-time-picker"
      className="flex flex-row"
      onClick={(e) => util.stop(e)}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {ui.datepicker(date, {
        deadlineOrSchedule,
        onChange: (e: React.SyntheticEvent, date: DateTime) => {
          util.stop(e);
          const date = t.toDefaultTimeZone(date);
          const journal = date.journalName();
          // deadline-or-schedule? is handled in on-submit, not here
          if (!deadlineOrSchedule) {
            // similar to page reference
            editorHandler.insertCommand(
              domId,
              pageRef.toPageRef(journal),
              format,
              { command: "page-ref" }
            );
            state.clearEditorAction();
            commands.setCurrentCommand(null);
          }
        },
      })}
      {deadlineOrSchedule && <TimeRepeater />}
    </div>
  );
};

export default DatePicker;
