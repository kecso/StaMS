/**
 * Server-side Langium access for StaMS plugins.
 *
 * WebGME plugins load this module as `stams/sm-langium` (AMD bundle at
 * build/stams/sm-langium.js). It wraps the generated grammar services and
 * exposes parse + AST traversal without pulling LSP or Monaco into plugins.
 */
import { DiagnosticSeverity, type Diagnostic } from 'vscode-languageserver-types';
import { EmptyFileSystem, URI, type LangiumDocument } from 'langium';

import { createStateMachineServices, type StateMachineServices } from './language/state-machine-module.js';
import {
    type ActionDecl,
    type ConstraintDecl,
    type EventDecl,
    type GuardDecl,
    type Machine,
    type Model,
    type State,
    type Transition,
    type VariableDecl,
    isModel
} from './language/generated/ast.js';

export type {
    ActionDecl,
    ConstraintDecl,
    EventDecl,
    GuardDecl,
    Machine,
    Model,
    State,
    Transition,
    VariableDecl
};

export type ParseSmResult = {
    model: Model;
    document: LangiumDocument<Model>;
    diagnostics: Diagnostic[];
};

export type SmTraverseHandlers = {
    onMachine?: (machine: Machine) => void;
    onVariable?: (variable: VariableDecl, machine: Machine) => void;
    onEvent?: (event: EventDecl, machine: Machine) => void;
    onAction?: (action: ActionDecl, machine: Machine) => void;
    onGuard?: (guard: GuardDecl, machine: Machine) => void;
    onConstraint?: (constraint: ConstraintDecl, machine: Machine) => void;
    onState?: (state: State, machine: Machine, parent?: State) => void;
    onTransition?: (transition: Transition, source: State, machine: Machine) => void;
};

export type ModelSummary = {
    machineNames: string[];
    stateCount: number;
    transitionCount: number;
    eventCount: number;
    errorCount: number;
    warningCount: number;
};

let services: StateMachineServices | undefined;

/**
 * Lazily-created Langium services for the state-machine grammar.
 * Reused across plugin invocations within one server process.
 */
export function getLangiumServices(): StateMachineServices {
    if (!services) {
        services = createStateMachineServices(EmptyFileSystem).StateMachine;
    }
    return services;
}

/**
 * Parse `.sm` text into a linked Langium AST (references resolved, validation run).
 */
export async function parseSm(text: string, documentUri = 'memory:///document.sm'): Promise<ParseSmResult> {
    const sm = getLangiumServices();
    const document = sm.shared.workspace.LangiumDocumentFactory.fromString<Model>(
        text,
        URI.parse(documentUri)
    );
    sm.shared.workspace.LangiumDocuments.addDocument(document);
    await sm.shared.workspace.DocumentBuilder.build([document], { validation: true });

    const model = document.parseResult.value;
    if (!isModel(model)) {
        throw new Error('Langium parser did not produce a Model root node');
    }

    return {
        model,
        document,
        diagnostics: document.diagnostics ?? []
    };
}

export function hasParseErrors(diagnostics: Diagnostic[]): boolean {
    return diagnostics.some((diagnostic) => diagnostic.severity === DiagnosticSeverity.Error);
}

/** True when the text is not valid `.sm` syntax (lexer/parser). */
export function hasSyntaxErrors(document: LangiumDocument<Model>): boolean {
    return document.parseResult.lexerErrors.length > 0 || document.parseResult.parserErrors.length > 0;
}

export function formatSyntaxErrors(document: LangiumDocument<Model>): string {
    const lines: string[] = [];
    document.parseResult.lexerErrors.forEach((error) => {
        lines.push('lexer: ' + String(error.message ?? error));
    });
    document.parseResult.parserErrors.forEach((error) => {
        lines.push('parser: ' + String(error.message ?? error));
    });
    return lines.join('\n');
}

export function formatDiagnostics(diagnostics: Diagnostic[]): string {
    return diagnostics
        .map((diagnostic) => {
            const line = (diagnostic.range?.start?.line ?? 0) + 1;
            const col = (diagnostic.range?.start?.character ?? 0) + 1;
            const level = diagnostic.severity === DiagnosticSeverity.Error ? 'error' : 'warning';
            return `${level}@${line}:${col}: ${diagnostic.message}`;
        })
        .join('\n');
}

/** Walk machines, nested states, and transitions in document order. */
export function traverseModel(model: Model, handlers: SmTraverseHandlers): void {
    model.machines.forEach((machine) => {
        handlers.onMachine?.(machine);

        machine.variablesBlock?.variables.forEach((variable) => {
            handlers.onVariable?.(variable, machine);
        });
        machine.eventsBlock?.events.forEach((event) => {
            handlers.onEvent?.(event, machine);
        });
        machine.actionsBlock?.actions.forEach((action) => {
            handlers.onAction?.(action, machine);
        });
        machine.guardsBlock?.guards.forEach((guard) => {
            handlers.onGuard?.(guard, machine);
        });
        machine.constraintsBlock?.constraints.forEach((constraint) => {
            handlers.onConstraint?.(constraint, machine);
        });

        traverseStates(machine.states, machine, undefined, handlers);
    });
}

function traverseStates(
    states: State[],
    machine: Machine,
    parent: State | undefined,
    handlers: SmTraverseHandlers
): void {
    states.forEach((state) => {
        handlers.onState?.(state, machine, parent);
        state.transitions.forEach((transition) => {
            handlers.onTransition?.(transition, state, machine);
        });
        traverseStates(state.states, machine, state, handlers);
    });
}

/** Compact stats for logging / plugin messages before GME sync is implemented. */
export function summarizeModel(model: Model, diagnostics: Diagnostic[] = []): ModelSummary {
    const summary: ModelSummary = {
        machineNames: [],
        stateCount: 0,
        transitionCount: 0,
        eventCount: 0,
        errorCount: 0,
        warningCount: 0
    };

    diagnostics.forEach((diagnostic) => {
        if (diagnostic.severity === DiagnosticSeverity.Error) {
            summary.errorCount += 1;
        } else if (diagnostic.severity === DiagnosticSeverity.Warning) {
            summary.warningCount += 1;
        }
    });

    traverseModel(model, {
        onMachine: (machine) => {
            summary.machineNames.push(machine.name);
            summary.eventCount += machine.eventsBlock?.events.length ?? 0;
        },
        onState: () => {
            summary.stateCount += 1;
        },
        onTransition: () => {
            summary.transitionCount += 1;
        }
    });

    return summary;
}
