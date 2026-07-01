grammar StateMachine

entry Model:
    (machines+=Machine)*;

Machine:
    'machine' name=ID '{'
        ('description' description=STRING)?
        (variablesBlock=VariablesBlock)?
        (eventsBlock=EventsBlock)?
        (actionsBlock=ActionsBlock)?
        (guardsBlock=GuardsBlock)?
        (constraintsBlock=ConstraintsBlock)?
        (states+=State)*
    '}';

VariablesBlock:
    'variables' '{' (variables+=VariableDecl)* '}';

VariableDecl:
    name=ID ':' type=VarType ('=' init=Expression)? ';'?;

VarType returns string:
    'float' | 'string';

EventsBlock:
    'events' '{' (events+=EventDecl)* '}';

EventDecl:
    name=ID ';'?;

ActionsBlock:
    'actions' '{' (actions+=ActionDecl)* '}';

ActionDecl:
    name=ID '{' (statements+=Statement)* '}' ';'?;

GuardsBlock:
    'guards' '{' (guards+=GuardDecl)* '}';

GuardDecl:
    name=ID '{' (statements+=Statement)* '}' ';'?;

ConstraintsBlock:
    'constraints' '{' (constraints+=ConstraintDecl)* '}';

ConstraintDecl:
    kind=ConstraintKind name=ID '{' (statements+=Statement)* '}' ';'?;

ConstraintKind returns string:
    'safety' | 'goal';

Statement:
    Assignment | ExpressionStmt;

Assignment:
    target=[VariableDecl:ID] '=' value=Expression ';'?;

ExpressionStmt:
    expression=Expression ';'?;

State:
    (isInitial?='initial')? (isFinal?='final')? 'state' name=ID '{'
        ('entry' entry=[ActionDecl:ID])?
        ('run' run=[ActionDecl:ID])?
        ('exit' exit=[ActionDecl:ID])?
        (transitions+=Transition)*
    '}';

/** Source state is the containing State; target, guard, and action are explicit references. */
Transition:
    'on' event=[EventDecl:ID] '->' target=[State:ID]
    ('guard' guard=[GuardDecl:ID])?
    ('do' action=[ActionDecl:ID])? ';'?;

Expression:
    OrExpr;

OrExpr infers Expression:
    AndExpr ({infer OrExpr} '||' right+=AndExpr)*;

AndExpr infers Expression:
    EqualityExpr ({infer AndExpr} '&&' right+=EqualityExpr)*;

EqualityExpr infers Expression:
    RelationalExpr (('==' | '!=') right+=RelationalExpr)*;

RelationalExpr infers Expression:
    AdditiveExpr (('<' | '<=' | '>' | '>=') right+=AdditiveExpr)*;

AdditiveExpr infers Expression:
    MultiplicativeExpr (('+' | '-') right+=MultiplicativeExpr)*;

MultiplicativeExpr infers Expression:
    UnaryExpr (('*' | '/') right+=UnaryExpr)*;

UnaryExpr infers Expression:
    ('!' | '-')? primary=PrimaryExpr;

PrimaryExpr infers Expression:
    '(' expression=Expression ')' |
    NumberLiteral |
    StringLiteral |
    InStateExpr |
    StateCompareExpr |
    VariableRef |
    FunctionCall;

InStateExpr infers Expression:
    'inState' '(' stateRef=[State:ID] ')';

StateCompareExpr infers Expression:
    'state' op=('==' | '!=') stateRef=[State:ID];

VariableRef infers Expression:
    variable=[VariableDecl:ID];

FunctionCall infers Expression:
    callee=ID '(' (args+=Expression (',' args+=Expression)*)? ')';

NumberLiteral infers Expression:
    value=NUMBER;

StringLiteral infers Expression:
    value=STRING;

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal STRING: /"[^"]*"/;
terminal NUMBER: /[0-9]+(\.[0-9]+)?/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
