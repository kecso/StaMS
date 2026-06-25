grammar StateMachine

entry Model:
    (elements+=TopLevelElement)*;

TopLevelElement:
    ImportStatement | EventsBlock | ActionsBlock | Machine;

ImportStatement:
    'import' ref=STRING;

EventsBlock:
    'events' '{' (events+=EventDecl)* '}';

ActionsBlock:
    'actions' '{' (actions+=ActionDecl)* '}';

Machine:
    'machine' name=ID '{'
        (eventsBlock=EventsBlock)?
        (actionsBlock=ActionsBlock)?
        (states+=State)*
    '}';

EventDecl:
    name=ID;

ActionDecl:
    name=ID '(' ')' ';'?;

State:
    ('initial')? 'state' name=ID '{'
        (transitions+=Transition)*
        (states+=State)*
    '}';

Transition:
    'on' event=[EventDecl:ID] ('[' guard=GuardExpr ']')? '->' target=[State:ID] ('/' action=[ActionDecl:ID])? ';'?;

GuardExpr:
    value=STRING;

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal STRING: /"[^"]*"/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
